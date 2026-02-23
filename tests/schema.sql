-- User table (dbAuth compatible)
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_user_tenant ON user(tenant_id);

-- Daily Wellness table
CREATE TABLE IF NOT EXISTS daily_wellness (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  rhr REAL NOT NULL,
  hrv_rmssd REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, user_id, date)
);

CREATE INDEX idx_daily_wellness_tenant_date ON daily_wellness(tenant_id, date);
CREATE INDEX idx_daily_wellness_user ON daily_wellness(user_id);

-- Workout Session table
CREATE TABLE IF NOT EXISTS workout_session (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  modality TEXT NOT NULL CHECK (modality IN ('strength', 'rowing', 'running', 'cycling', 'swimming', 'other')),
  duration_minutes INTEGER NOT NULL,
  srpe INTEGER NOT NULL CHECK (srpe >= 1 AND srpe <= 10),
  training_load INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_workout_session_tenant_date ON workout_session(tenant_id, date);
CREATE INDEX idx_workout_session_user ON workout_session(user_id);
-- Add subjective metrics columns to daily_wellness
ALTER TABLE daily_wellness ADD COLUMN sleep_score INTEGER CHECK(sleep_score IS NULL OR (sleep_score >= 1 AND sleep_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN fatigue_score INTEGER CHECK(fatigue_score IS NULL OR (fatigue_score >= 1 AND fatigue_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN muscle_soreness_score INTEGER CHECK(muscle_soreness_score IS NULL OR (muscle_soreness_score >= 1 AND muscle_soreness_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN stress_score INTEGER CHECK(stress_score IS NULL OR (stress_score >= 1 AND stress_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN mood_score INTEGER CHECK(mood_score IS NULL OR (mood_score >= 1 AND mood_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN diet_score INTEGER CHECK(diet_score IS NULL OR (diet_score >= 1 AND diet_score <= 5));
-- Exercise Dictionary table with self-referencing FK
CREATE TABLE IF NOT EXISTS exercise_dictionary (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  movement_category TEXT NOT NULL,
  progression_level INTEGER NOT NULL,
  exercise_type TEXT NOT NULL DEFAULT 'dynamic' CHECK (exercise_type IN ('dynamic', 'isometric', 'eccentric')),
  benchmark_target TEXT,
  master_exercise_id TEXT,
  conversion_factor REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (master_exercise_id) REFERENCES exercise_dictionary(id) ON DELETE SET NULL
);

CREATE INDEX idx_exercise_dictionary_tenant ON exercise_dictionary(tenant_id);
CREATE INDEX idx_exercise_dictionary_master ON exercise_dictionary(master_exercise_id);
CREATE UNIQUE INDEX idx_exercise_dictionary_tenant_name ON exercise_dictionary(tenant_id, name);

-- User Benchmarks table
CREATE TABLE IF NOT EXISTS user_benchmarks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  benchmark_name TEXT NOT NULL,
  benchmark_value REAL,
  benchmark_unit TEXT,
  master_exercise_id TEXT,
  one_rep_max_weight REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (master_exercise_id) REFERENCES exercise_dictionary(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_benchmarks_tenant ON user_benchmarks(tenant_id);
CREATE INDEX idx_user_benchmarks_user ON user_benchmarks(user_id);
CREATE INDEX idx_user_benchmarks_master ON user_benchmarks(master_exercise_id);
CREATE UNIQUE INDEX idx_user_benchmarks_user_exercise ON user_benchmarks(tenant_id, user_id, master_exercise_id);
-- Add exercise_type column to exercise_dictionary
ALTER TABLE exercise_dictionary ADD COLUMN exercise_type TEXT NOT NULL DEFAULT 'dynamic'
  CHECK (exercise_type IN ('dynamic', 'isometric', 'eccentric'));

-- Add benchmark_target column (will replace master_exercise_id)
ALTER TABLE exercise_dictionary ADD COLUMN benchmark_target TEXT;

-- Add benchmark_value and benchmark_unit to user_benchmarks
ALTER TABLE user_benchmarks ADD COLUMN benchmark_value REAL;
ALTER TABLE user_benchmarks ADD COLUMN benchmark_unit TEXT;

-- Migrate existing data: copy one_rep_max_weight to benchmark_value
UPDATE user_benchmarks SET 
  benchmark_value = one_rep_max_weight,
  benchmark_unit = 'kg'
WHERE benchmark_value IS NULL;

-- Migrate master_exercise_id to benchmark_target by looking up exercise names
-- (For existing data, we'll copy the master exercise name as benchmark_target)
UPDATE exercise_dictionary 
SET benchmark_target = (
  SELECT ed2.name 
  FROM exercise_dictionary ed2 
  WHERE ed2.id = exercise_dictionary.master_exercise_id
)
WHERE master_exercise_id IS NOT NULL;

-- Create index on new columns
CREATE INDEX idx_exercise_dictionary_benchmark_target ON exercise_dictionary(benchmark_target);
CREATE INDEX idx_user_benchmarks_benchmark_unit ON user_benchmarks(benchmark_unit);
