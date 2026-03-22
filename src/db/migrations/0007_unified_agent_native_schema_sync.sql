-- Migration: unified_agent_native_schema_sync
-- Consolidates previous attempts into a clean, Agent-Native synchronized structure.
-- Added: User profiles, Wellness benchmarks, and Flattened Session Metrics.

-- 1. Athlete Grouping & Identification (Simplified)
ALTER TABLE user ADD COLUMN display_name TEXT;
CREATE INDEX idx_user_display_name ON user(display_name);

-- 2. Daily Wellness Readiness Fields
ALTER TABLE daily_wellness ADD COLUMN body_weight REAL;

-- 3. Flattened Session Exercise Metrics
ALTER TABLE session_exercise ADD COLUMN target_sets INTEGER;
ALTER TABLE session_exercise ADD COLUMN target_reps TEXT;
ALTER TABLE session_exercise ADD COLUMN target_intensity REAL;
ALTER TABLE session_exercise ADD COLUMN target_rpe REAL;
ALTER TABLE session_exercise ADD COLUMN target_tempo TEXT;
ALTER TABLE session_exercise ADD COLUMN target_rest_seconds INTEGER;

-- 4. Exercise Dictionary Enhancements (Flexible String Pattern)
-- Recreating the table to add properties without strict enum constraints
CREATE TABLE exercise_dictionary_new (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,  -- NULL for global system templates
  name TEXT NOT NULL,
  movement_category TEXT NOT NULL,
  exercise_type TEXT NOT NULL DEFAULT 'dynamic',
  benchmark_target TEXT,
  conversion_factor REAL,
  percent_bodyweight_used REAL NOT NULL DEFAULT 0,
  equipment_type TEXT,
  rounding_increment REAL NOT NULL DEFAULT 2.5,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO exercise_dictionary_new (
  id, tenant_id, name, movement_category, exercise_type,
  benchmark_target, conversion_factor, created_at, updated_at
)
SELECT
  id, tenant_id, name, movement_category, exercise_type,
  benchmark_target, conversion_factor, created_at, updated_at
FROM exercise_dictionary;

DROP TABLE exercise_dictionary;
ALTER TABLE exercise_dictionary_new RENAME TO exercise_dictionary;

CREATE INDEX idx_exercise_dictionary_tenant ON exercise_dictionary(tenant_id);
CREATE INDEX idx_exercise_dictionary_benchmark_target ON exercise_dictionary(benchmark_target);
CREATE INDEX idx_exercise_dictionary_category ON exercise_dictionary(movement_category);
CREATE UNIQUE INDEX idx_exercise_dictionary_tenant_name ON exercise_dictionary(tenant_id, name);
