-- Migration: Remove strict Enum constraint on movement_category
-- This migration allows for flexible, hybrid training modalities by changing the
-- movement_category column from a strict CHECK constraint to a regular TEXT field.
-- This enables custom movement categories and hybrid training classifications.

-- ============================================================================
-- STEP 1: Create new table without the CHECK constraint
-- ============================================================================

-- SQLite doesn't support ALTER COLUMN to remove constraints, so we recreate the table
CREATE TABLE exercise_dictionary_new (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,  -- NULL for global system templates
  name TEXT NOT NULL,
  movement_category TEXT NOT NULL,  -- Removed CHECK constraint - now flexible string
  exercise_type TEXT NOT NULL DEFAULT 'dynamic'
    CHECK (exercise_type IN ('dynamic', 'isometric', 'eccentric')),
  benchmark_target TEXT,  -- Links to UserBenchmark.benchmark_name
  conversion_factor REAL,  -- e.g., 0.70 for Goblet Squat -> Squat
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- STEP 2: Migrate data to new table
-- ============================================================================

-- Copy all existing data
INSERT INTO exercise_dictionary_new (id, tenant_id, name, movement_category, exercise_type, benchmark_target, conversion_factor, created_at, updated_at)
SELECT id, tenant_id, name, movement_category, exercise_type, benchmark_target, conversion_factor, created_at, updated_at
FROM exercise_dictionary;

-- ============================================================================
-- STEP 3: Drop old table and rename
-- ============================================================================

DROP TABLE exercise_dictionary;
ALTER TABLE exercise_dictionary_new RENAME TO exercise_dictionary;

-- ============================================================================
-- STEP 4: Recreate indexes
-- ============================================================================

CREATE INDEX idx_exercise_dictionary_tenant ON exercise_dictionary(tenant_id);
CREATE INDEX idx_exercise_dictionary_benchmark_target ON exercise_dictionary(benchmark_target);
CREATE UNIQUE INDEX idx_exercise_dictionary_tenant_name ON exercise_dictionary(tenant_id, name);
