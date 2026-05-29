import { env } from 'cloudflare:test';
import { beforeAll } from 'vitest';

const SCHEMA = `
-- User table (dbAuth compatible)
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  external_auth_id TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'athlete' CHECK (role IN ('athlete', 'admin')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  date_of_birth TEXT,
  gender TEXT,
  height_cm REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_external_auth_id ON user(external_auth_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant ON user(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_display_name ON user(display_name);

-- Tenant Settings table
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id TEXT PRIMARY KEY,
  organization_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  default_barbell_rounding REAL NOT NULL DEFAULT 2.5
);

-- Daily Wellness table
CREATE TABLE IF NOT EXISTS daily_wellness (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  rhr REAL NOT NULL,
  hrv_rmssd REAL NOT NULL,
  body_weight REAL,
  sleep_score INTEGER CHECK(sleep_score IS NULL OR (sleep_score >= 1 AND sleep_score <= 5)),
  fatigue_score INTEGER CHECK(fatigue_score IS NULL OR (fatigue_score >= 1 AND fatigue_score <= 5)),
  muscle_soreness_score INTEGER CHECK(muscle_soreness_score IS NULL OR (muscle_soreness_score >= 1 AND muscle_soreness_score <= 5)),
  stress_score INTEGER CHECK(stress_score IS NULL OR (stress_score >= 1 AND stress_score <= 5)),
  mood_score INTEGER CHECK(mood_score IS NULL OR (mood_score >= 1 AND mood_score <= 5)),
  diet_score INTEGER CHECK(diet_score IS NULL OR (diet_score >= 1 AND diet_score <= 5)),
  data_source TEXT NOT NULL DEFAULT 'manual_slider' CHECK (data_source IN ('apple_health', 'manual_slider', 'agent_voice')),
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
  planned_session_id TEXT,
  date TEXT NOT NULL,
  completed_as_planned INTEGER NOT NULL DEFAULT 1 CHECK (completed_as_planned IN (0, 1)),
  is_voice_entry INTEGER NOT NULL DEFAULT 0 CHECK (is_voice_entry IN (0, 1)),
  agent_interaction_log TEXT,
  duration_minutes INTEGER NOT NULL,
  srpe INTEGER NOT NULL CHECK (srpe >= 1 AND srpe <= 10),
  training_load INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workout_session_tenant_date ON workout_session(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_session_user ON workout_session(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_session_planned ON workout_session(planned_session_id);

-- Exercise Dictionary table (Hybrid Multi-Tenant: tenant_id NULL = System Template)
CREATE TABLE IF NOT EXISTS exercise_dictionary (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  name TEXT NOT NULL,
  movement_category TEXT NOT NULL,
  exercise_type TEXT NOT NULL DEFAULT 'dynamic' CHECK (exercise_type IN ('dynamic', 'isometric', 'eccentric')),
  benchmark_target TEXT,
  conversion_factor REAL,
  percent_bodyweight_used REAL NOT NULL DEFAULT 0,
  equipment_type TEXT,
  rounding_increment REAL NOT NULL DEFAULT 2.5,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exercise_dictionary_tenant ON exercise_dictionary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exercise_dictionary_benchmark_target ON exercise_dictionary(benchmark_target);
CREATE INDEX IF NOT EXISTS idx_exercise_dictionary_category ON exercise_dictionary(movement_category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_dictionary_tenant_name ON exercise_dictionary(tenant_id, name);

-- User Benchmarks table
CREATE TABLE IF NOT EXISTS user_benchmarks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  benchmark_name TEXT NOT NULL,
  benchmark_value REAL,
  benchmark_unit TEXT CHECK (benchmark_unit IN ('kg', 'lbs', 'seconds', 'reps', 'meters')),
  training_max_percentage REAL NOT NULL DEFAULT 100.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, user_id, benchmark_name)
);

CREATE INDEX IF NOT EXISTS idx_user_benchmarks_tenant ON user_benchmarks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_benchmarks_user ON user_benchmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_benchmarks_benchmark_name ON user_benchmarks(benchmark_name);

-- Training Plan table (Hybrid Multi-Tenant: tenant_id NULL = System Template)
CREATE TABLE IF NOT EXISTS training_plan (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  name TEXT NOT NULL,
  is_system_template INTEGER NOT NULL DEFAULT 0 CHECK (is_system_template IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_training_plan_tenant ON training_plan(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_plan_system ON training_plan(is_system_template);

-- Training Session table
CREATE TABLE IF NOT EXISTS training_session (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  plan_id TEXT NOT NULL,
  block_name TEXT,
  week_number INTEGER,
  day_of_week TEXT,
  session_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES training_plan(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_training_session_tenant ON training_session(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_session_plan ON training_session(plan_id);

-- Session Exercise table (Macro Prescription Junction)
CREATE TABLE IF NOT EXISTS session_exercise (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  session_id TEXT NOT NULL,
  exercise_dictionary_id TEXT NOT NULL,
  circuit_group TEXT,
  order_in_session INTEGER NOT NULL,
  scheme_name TEXT,
  coach_notes TEXT,
  prescribed_rest_min INTEGER,
  prescribed_rest_max INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES training_session(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_dictionary_id) REFERENCES exercise_dictionary(id)
);

CREATE INDEX IF NOT EXISTS idx_session_exercise_tenant ON session_exercise(tenant_id);
CREATE INDEX IF NOT EXISTS idx_session_exercise_session ON session_exercise(session_id);
CREATE INDEX IF NOT EXISTS idx_session_exercise_exercise_dict ON session_exercise(exercise_dictionary_id);

-- Exercise Set table
CREATE TABLE IF NOT EXISTS exercise_set (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  session_exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  conversion_factor REAL,
  prescribed_reps_min INTEGER,
  prescribed_reps_max INTEGER,
  prescribed_weight REAL,
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

CREATE INDEX IF NOT EXISTS idx_exercise_set_tenant ON exercise_set(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exercise_set_session_exercise ON exercise_set(session_exercise_id);

-- Athlete Profile table
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

CREATE INDEX IF NOT EXISTS idx_athlete_profile_tenant ON athlete_profile(tenant_id);
CREATE INDEX IF NOT EXISTS idx_athlete_profile_user ON athlete_profile(user_id);

-- Injury History table
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

CREATE INDEX IF NOT EXISTS idx_injury_history_tenant ON injury_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_injury_history_user ON injury_history(user_id);

-- Equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  name TEXT UNIQUE NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_equipment_tenant ON equipment(tenant_id);

-- Athlete Equipment table
CREATE TABLE IF NOT EXISTS athlete_equipment (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, user_id, equipment_id)
);

CREATE INDEX IF NOT EXISTS idx_athlete_equipment_tenant ON athlete_equipment(tenant_id);
CREATE INDEX IF NOT EXISTS idx_athlete_equipment_user ON athlete_equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_athlete_equipment_equipment ON athlete_equipment(equipment_id);

-- Exercise Equipment table
CREATE TABLE IF NOT EXISTS exercise_equipment (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  exercise_dictionary_id TEXT NOT NULL REFERENCES exercise_dictionary(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, exercise_dictionary_id, equipment_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_equipment_tenant ON exercise_equipment(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exercise_equipment_exercise ON exercise_equipment(exercise_dictionary_id);
CREATE INDEX IF NOT EXISTS idx_exercise_equipment_equipment ON exercise_equipment(equipment_id);
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
