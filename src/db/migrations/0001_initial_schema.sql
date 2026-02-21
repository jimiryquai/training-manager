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
