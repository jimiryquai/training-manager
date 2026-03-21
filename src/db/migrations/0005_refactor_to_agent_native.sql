-- Migration: Refactor to Agent-Native Architecture
-- This migration transitions the existing SaaS schema to the new Agent-Native ERD
-- Key changes: Hybrid Multi-Tenant pattern, flattened periodization, AI agent audit fields

-- ============================================================================
-- STEP 1: Create new tables for flattened periodization
-- ============================================================================

-- TenantSettings: Global tenant configuration
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id TEXT PRIMARY KEY,
  organization_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  default_barbell_rounding REAL NOT NULL DEFAULT 2.5
);

-- TrainingPlan: Top-level periodization container (tenant_id NULL = System Template)
CREATE TABLE IF NOT EXISTS training_plan (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,  -- NULL for global system templates
  name TEXT NOT NULL,
  is_system_template INTEGER NOT NULL DEFAULT 0 CHECK (is_system_template IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_training_plan_tenant ON training_plan(tenant_id);
CREATE INDEX idx_training_plan_system ON training_plan(is_system_template);

-- TrainingSession: Individual workout sessions within a plan
CREATE TABLE IF NOT EXISTS training_session (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  block_name TEXT,  -- e.g., 'Hypertrophy', 'Strength'
  week_number INTEGER,
  day_of_week TEXT,  -- e.g., 'Monday', 'Tuesday'
  session_name TEXT,  -- e.g., 'Power Day', 'Volume Day'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES training_plan(id) ON DELETE CASCADE
);

CREATE INDEX idx_training_session_tenant ON training_session(tenant_id);
CREATE INDEX idx_training_session_plan ON training_session(plan_id);

-- SessionExercise: Individual exercises within a training session
CREATE TABLE IF NOT EXISTS session_exercise (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  exercise_dictionary_id TEXT NOT NULL,
  circuit_group TEXT,  -- Groups supersets: 'A', 'B', 'Warmup', etc.
  order_in_session INTEGER NOT NULL,
  scheme_name TEXT,  -- e.g., 'Constant Wave 2x8/6/4'
  coach_notes TEXT,  -- AI or coach instructions
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES training_session(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_dictionary_id) REFERENCES exercise_dictionary(id) ON DELETE RESTRICT
);

CREATE INDEX idx_session_exercise_tenant ON session_exercise(tenant_id);
CREATE INDEX idx_session_exercise_session ON session_exercise(session_id);
CREATE INDEX idx_session_exercise_exercise ON session_exercise(exercise_dictionary_id);

-- ============================================================================
-- STEP 2: Modify existing tables for Agent-Native architecture
-- ============================================================================

-- Add new columns to user table for Passkey auth and agent-native roles
ALTER TABLE user ADD COLUMN external_auth_id TEXT;  -- For RedwoodSDK Passkeys
ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'athlete' 
  CHECK (role IN ('athlete', 'admin'));
ALTER TABLE user ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 
  CHECK (is_active IN (0, 1));

-- Create unique index for external_auth_id
CREATE UNIQUE INDEX idx_user_external_auth_id ON user(external_auth_id);

-- Add data_source column to daily_wellness for tracking entry method
ALTER TABLE daily_wellness ADD COLUMN data_source TEXT NOT NULL DEFAULT 'manual_slider'
  CHECK (data_source IN ('apple_health', 'manual_slider', 'agent_voice'));

-- Add Agent-Native audit fields to workout_session
ALTER TABLE workout_session ADD COLUMN planned_session_id TEXT;
ALTER TABLE workout_session ADD COLUMN completed_as_planned INTEGER NOT NULL DEFAULT 1 
  CHECK (completed_as_planned IN (0, 1));
ALTER TABLE workout_session ADD COLUMN is_voice_entry INTEGER NOT NULL DEFAULT 0 
  CHECK (is_voice_entry IN (0, 1));
ALTER TABLE workout_session ADD COLUMN agent_interaction_log TEXT;  -- JSON audit log

-- Create index for planned_session_id FK relationship
CREATE INDEX idx_workout_session_planned ON workout_session(planned_session_id);

-- Add training_max_percentage to user_benchmarks for Wendler 5/3/1 support
ALTER TABLE user_benchmarks ADD COLUMN training_max_percentage REAL NOT NULL DEFAULT 100.0;

-- ============================================================================
-- STEP 3: Modify exercise_dictionary for Hybrid Multi-Tenant pattern
-- ============================================================================

-- Create new table with nullable tenant_id for global system templates
-- SQLite doesn't support ALTER COLUMN, so we recreate the table

-- First, create temp table with new schema
CREATE TABLE exercise_dictionary_new (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,  -- NULL for global system templates
  name TEXT NOT NULL,
  movement_category TEXT NOT NULL 
    CHECK (movement_category IN (
      'squat', 'hinge', 'push', 'pull', 'carry', 'core', 'cardio',
      'horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull',
      'unilateral_leg', 'bilateral_leg', 'core_flexion', 'core_rotation',
      'core_antiextension', 'core_antilateral', 'conditioning',
      'mobility', 'warmup', 'cooldown'
    )),
  exercise_type TEXT NOT NULL DEFAULT 'dynamic'
    CHECK (exercise_type IN ('dynamic', 'isometric', 'eccentric')),
  benchmark_target TEXT,  -- Links to UserBenchmark.benchmark_name
  conversion_factor REAL,  -- e.g., 0.70 for Goblet Squat -> Squat
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Migrate data (drop progression_level and master_exercise_id columns)
INSERT INTO exercise_dictionary_new (id, tenant_id, name, movement_category, exercise_type, benchmark_target, conversion_factor, created_at, updated_at)
SELECT id, tenant_id, name, movement_category, exercise_type, benchmark_target, conversion_factor, created_at, updated_at
FROM exercise_dictionary;

-- Drop old table and rename
DROP TABLE exercise_dictionary;
ALTER TABLE exercise_dictionary_new RENAME TO exercise_dictionary;

-- Recreate indexes
CREATE INDEX idx_exercise_dictionary_tenant ON exercise_dictionary(tenant_id);
CREATE INDEX idx_exercise_dictionary_benchmark_target ON exercise_dictionary(benchmark_target);
CREATE UNIQUE INDEX idx_exercise_dictionary_tenant_name ON exercise_dictionary(tenant_id, name);

-- ============================================================================
-- STEP 4: Modify user_benchmarks to rename columns
-- ============================================================================

-- Create new table with renamed column and removed master_exercise_id
CREATE TABLE user_benchmarks_new (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  benchmark_name TEXT NOT NULL,  -- Renamed from implicit name via master_exercise_id
  benchmark_value REAL,
  benchmark_unit TEXT CHECK (benchmark_unit IN ('kg', 'lbs', 'seconds', 'reps', 'meters')),
  training_max_percentage REAL NOT NULL DEFAULT 100.0,  -- For Wendler 5/3/1 support
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, user_id, benchmark_name)
);

-- Migrate data - use benchmark_target as benchmark_name (it was populated in migration 0004)
-- For existing records, we use a lookup to get the benchmark name from the old structure
INSERT INTO user_benchmarks_new (id, tenant_id, user_id, benchmark_name, benchmark_value, benchmark_unit, training_max_percentage, created_at, updated_at)
SELECT 
  ub.id, 
  ub.tenant_id, 
  ub.user_id, 
  COALESCE(ed.benchmark_target, 'Unknown Benchmark') as benchmark_name,
  ub.benchmark_value,
  ub.benchmark_unit,
  100.0 as training_max_percentage,
  ub.created_at,
  ub.updated_at
FROM user_benchmarks ub
LEFT JOIN exercise_dictionary ed ON ed.id = ub.master_exercise_id;

-- Drop old table and rename
DROP TABLE user_benchmarks;
ALTER TABLE user_benchmarks_new RENAME TO user_benchmarks;

-- Recreate indexes
CREATE INDEX idx_user_benchmarks_tenant ON user_benchmarks(tenant_id);
CREATE INDEX idx_user_benchmarks_user ON user_benchmarks(user_id);
CREATE INDEX idx_user_benchmarks_benchmark_name ON user_benchmarks(benchmark_name);

-- ============================================================================
-- STEP 5: Add foreign key constraint for planned_session_id
-- ============================================================================

-- SQLite doesn't support ADD CONSTRAINT, so we verify FK integrity via application layer
-- The relationship is: workout_session.planned_session_id -> training_session.id
-- This is enforced at the Kysely service layer

-- ============================================================================
-- STEP 6: Insert default tenant settings for existing tenants
-- ============================================================================

-- Create default tenant settings for any existing tenant_ids in the user table
INSERT OR IGNORE INTO tenant_settings (tenant_id, organization_name, timezone, default_barbell_rounding)
SELECT DISTINCT tenant_id, 'Default Organization', 'UTC', 2.5
FROM user
WHERE tenant_id IS NOT NULL;
