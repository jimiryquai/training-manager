-- Migration: bioenergetic_limiter_and_exercise_set
-- Three architectural changes for AI Coach bioenergetic profiling and set-by-set precision tracking
-- 
-- Changes:
--   1. User table: Add bioenergetic_limiter for RAG-based template adaptation
--   2. SessionExercise table: Convert to macro prescription junction (remove set-level, add rest range)
--   3. ExerciseSet table: Create new child table for set-by-set precision tracking

-- ============================================================================
-- 1. USER TABLE - Add Bioenergetic Limiter Column
-- ============================================================================
-- AI Coach uses this field to adapt training templates based on the athlete's
-- physiological limiter. No CHECK constraint for flexibility.
-- Values: 'Delivery', 'Respiratory', 'Utilization' (application-enforced)

ALTER TABLE user ADD COLUMN bioenergetic_limiter TEXT;

-- ============================================================================
-- 2. SESSION_EXERCISE TABLE - Convert to Macro Prescription Junction
-- ============================================================================
-- Remove granular set-level columns (moved to ExerciseSet child table)
-- Add compliance boundary rest range for autoregulation
-- Strategy: SQLite table recreation pattern (can't drop columns)

-- 2.1 Create new table with desired schema
CREATE TABLE session_exercise_new (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  session_id TEXT NOT NULL,
  exercise_dictionary_id TEXT NOT NULL,
  circuit_group TEXT,
  order_in_session INTEGER NOT NULL,
  scheme_name TEXT,
  coach_notes TEXT,
  -- Compliance Boundary: Rest range for autoregulation
  prescribed_rest_min INTEGER,
  prescribed_rest_max INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES training_session(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_dictionary_id) REFERENCES exercise_dictionary(id)
);

-- 2.2 Migrate data (exclude removed columns, set new columns to NULL)
INSERT INTO session_exercise_new (
  id,
  tenant_id,
  session_id,
  exercise_dictionary_id,
  circuit_group,
  order_in_session,
  scheme_name,
  coach_notes,
  prescribed_rest_min,
  prescribed_rest_max,
  created_at,
  updated_at
)
SELECT 
  id,
  tenant_id,
  session_id,
  exercise_dictionary_id,
  circuit_group,
  order_in_session,
  scheme_name,
  coach_notes,
  NULL,  -- prescribed_rest_min (new field)
  NULL,  -- prescribed_rest_max (new field)
  created_at,
  updated_at
FROM session_exercise;

-- 2.3 Drop old table
DROP TABLE session_exercise;

-- 2.4 Rename new table
ALTER TABLE session_exercise_new RENAME TO session_exercise;

-- 2.5 Recreate indexes
CREATE INDEX idx_session_exercise_tenant ON session_exercise(tenant_id);
CREATE INDEX idx_session_exercise_session ON session_exercise(session_id);
CREATE INDEX idx_session_exercise_exercise_dict ON session_exercise(exercise_dictionary_id);

-- ============================================================================
-- 3. EXERCISE_SET TABLE - Set-by-Set Precision Tracking (New Child Table)
-- ============================================================================
-- "Sub-Line Actuals" table for granular tracking of each set performed.
-- Supports AI Coach voice entry and athlete self-logging.

CREATE TABLE exercise_set (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  session_exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  -- Template Math (AI-calculated intra-session progression)
  conversion_factor REAL,
  -- The Prescription (AI Calculated)
  prescribed_reps_min INTEGER,
  prescribed_reps_max INTEGER,
  prescribed_weight REAL,
  -- The Execution (Athlete/Voice Logged)
  actual_reps INTEGER,
  actual_weight REAL,
  actual_rest_seconds INTEGER,
  rpe REAL,
  is_voice_entry INTEGER NOT NULL DEFAULT 0 CHECK (is_voice_entry IN (0, 1)),
  is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_exercise_id) REFERENCES session_exercise(id) ON DELETE CASCADE
);

-- Indexes for multi-tenant queries and parent-child joins
CREATE INDEX idx_exercise_set_tenant ON exercise_set(tenant_id);
CREATE INDEX idx_exercise_set_session_exercise ON exercise_set(session_exercise_id);
