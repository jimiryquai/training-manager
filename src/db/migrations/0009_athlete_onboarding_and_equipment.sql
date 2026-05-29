-- Migration: athlete_onboarding_and_equipment
-- Updates the database schema to support athlete onboarding, injury history, and equipment tracking.
-- 
-- Changes:
--   1. User table: Add date_of_birth, gender, height_cm columns, and drop bioenergetic_limiter (moved to athlete_profile)
--   2. AthleteProfile table: Create new table for mutable training preferences/status
--   3. InjuryHistory table: Create new table for tracking athlete injuries
--   4. Equipment table: Create global reference library for equipment (tenant_id = NULL for system template)
--   5. AthleteEquipment table: Junction table for athlete-specific equipment access
--   6. ExerciseEquipment table: Junction table for linking exercises to required equipment
--   7. Seeds: Pre-populate global equipment reference library

-- ============================================================================
-- 1. USER TABLE - Add demographics, remove bioenergetic_limiter
-- ============================================================================
ALTER TABLE user ADD COLUMN date_of_birth TEXT;
ALTER TABLE user ADD COLUMN gender TEXT;
ALTER TABLE user ADD COLUMN height_cm REAL;
ALTER TABLE user DROP COLUMN bioenergetic_limiter;

-- ============================================================================
-- 2. ATHLETE_PROFILE TABLE - Create Profile
-- ============================================================================
CREATE TABLE IF NOT EXISTS athlete_profile (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT UNIQUE NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  training_status TEXT NOT NULL CHECK (training_status IN ('untrained', 'detrained', 'trained')),
  training_age_years INTEGER NOT NULL DEFAULT 0,
  last_consistent_training_date TEXT,
  primary_goal TEXT CHECK (primary_goal IN ('fat_loss', 'muscle_gain', 'strength', 'general_fitness', 'sport_performance', 'rehabilitation')),
  training_days_per_week INTEGER NOT NULL DEFAULT 3,
  max_session_duration_minutes INTEGER NOT NULL DEFAULT 60,
  weekend_session_duration_minutes INTEGER,
  bioenergetic_limiter TEXT,
  sport_context TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_athlete_profile_tenant ON athlete_profile(tenant_id);
CREATE INDEX idx_athlete_profile_user ON athlete_profile(user_id);

-- ============================================================================
-- 3. INJURY_HISTORY TABLE - Create Injury Tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS injury_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  body_region TEXT NOT NULL CHECK (body_region IN ('neck', 'shoulder', 'upper_back', 'lower_back', 'chest', 'abdomen', 'elbow', 'wrist', 'hand', 'hip', 'groin', 'quadriceps', 'hamstrings', 'knee', 'calf', 'ankle', 'foot', 'other')),
  injury_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  status TEXT NOT NULL CHECK (status IN ('active', 'recovered', 'chronic')),
  date_occurred TEXT,
  contraindicated_movements TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_injury_history_tenant ON injury_history(tenant_id);
CREATE INDEX idx_injury_history_user ON injury_history(user_id);

-- ============================================================================
-- 4. EQUIPMENT TABLE - Create Reference library
-- ============================================================================
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  tenant_id TEXT, -- NULL for system templates / global reference
  name TEXT UNIQUE NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_equipment_tenant ON equipment(tenant_id);

-- ============================================================================
-- 5. ATHLETE_EQUIPMENT TABLE - Create Athlete Equipment Junction
-- ============================================================================
CREATE TABLE IF NOT EXISTS athlete_equipment (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, user_id, equipment_id)
);

CREATE INDEX idx_athlete_equipment_tenant ON athlete_equipment(tenant_id);
CREATE INDEX idx_athlete_equipment_user ON athlete_equipment(user_id);
CREATE INDEX idx_athlete_equipment_equipment ON athlete_equipment(equipment_id);

-- ============================================================================
-- 6. EXERCISE_EQUIPMENT TABLE - Create Exercise Equipment Junction
-- ============================================================================
CREATE TABLE IF NOT EXISTS exercise_equipment (
  id TEXT PRIMARY KEY,
  tenant_id TEXT, -- NULL for system templates
  exercise_dictionary_id TEXT NOT NULL REFERENCES exercise_dictionary(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, exercise_dictionary_id, equipment_id)
);

CREATE INDEX idx_exercise_equipment_tenant ON exercise_equipment(tenant_id);
CREATE INDEX idx_exercise_equipment_exercise ON exercise_equipment(exercise_dictionary_id);
CREATE INDEX idx_exercise_equipment_equipment ON exercise_equipment(equipment_id);

-- ============================================================================
-- 7. SEED DATA - Populate Global Equipment Reference Library
-- ============================================================================
INSERT INTO equipment (id, tenant_id, name, created_at, updated_at) VALUES
('eq_barbell', NULL, 'barbell', datetime('now'), datetime('now')),
('eq_dumbbell', NULL, 'dumbbell', datetime('now'), datetime('now')),
('eq_kettlebell', NULL, 'kettlebell', datetime('now'), datetime('now')),
('eq_pull_up_bar', NULL, 'pull-up bar', datetime('now'), datetime('now')),
('eq_rings', NULL, 'rings', datetime('now'), datetime('now')),
('eq_squat_rack', NULL, 'squat rack', datetime('now'), datetime('now')),
('eq_bench', NULL, 'bench', datetime('now'), datetime('now')),
('eq_leg_curl', NULL, 'leg curl machine', datetime('now'), datetime('now')),
('eq_cables', NULL, 'cables', datetime('now'), datetime('now')),
('eq_bands', NULL, 'bands', datetime('now'), datetime('now')),
('eq_bodyweight', NULL, 'bodyweight', datetime('now'), datetime('now'));
