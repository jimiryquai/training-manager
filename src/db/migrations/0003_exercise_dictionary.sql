-- Exercise Dictionary table with self-referencing FK
CREATE TABLE IF NOT EXISTS exercise_dictionary (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  movement_category TEXT NOT NULL,
  progression_level INTEGER NOT NULL,
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
  master_exercise_name TEXT NOT NULL,
  one_rep_max_weight REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_user_benchmarks_tenant ON user_benchmarks(tenant_id);
CREATE INDEX idx_user_benchmarks_user ON user_benchmarks(user_id);
CREATE UNIQUE INDEX idx_user_benchmarks_user_exercise ON user_benchmarks(tenant_id, user_id, master_exercise_name);
