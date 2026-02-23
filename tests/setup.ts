import { env } from 'cloudflare:test';
import { beforeAll } from 'vitest';

const SCHEMA = `
-- User table (dbAuth compatible)
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_tenant ON user(tenant_id);

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

CREATE INDEX IF NOT EXISTS idx_daily_wellness_tenant_date ON daily_wellness(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_wellness_user ON daily_wellness(user_id);

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

CREATE INDEX IF NOT EXISTS idx_workout_session_tenant_date ON workout_session(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_session_user ON workout_session(user_id);

-- Exercise Dictionary table
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

CREATE INDEX IF NOT EXISTS idx_exercise_dictionary_tenant ON exercise_dictionary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exercise_dictionary_master ON exercise_dictionary(master_exercise_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_dictionary_tenant_name ON exercise_dictionary(tenant_id, name);

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

CREATE INDEX IF NOT EXISTS idx_user_benchmarks_tenant ON user_benchmarks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_benchmarks_user ON user_benchmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_benchmarks_master ON user_benchmarks(master_exercise_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_benchmarks_user_exercise ON user_benchmarks(tenant_id, user_id, master_exercise_id);
`;

beforeAll(async () => {
  // @ts-expect-error
  if (env.DB) {
    const statements = SCHEMA.split(';')
      .map(s => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      // @ts-expect-error
      await env.DB.prepare(stmt).run();
    }
  }
});
