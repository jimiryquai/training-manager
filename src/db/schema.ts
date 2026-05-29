import { Generated, ColumnType } from 'kysely';

// ============================================================================
// Enum Types (Strict Type Safety)
// ============================================================================

/**
 * User roles - Agent-Native architecture only supports 'athlete' role
 * The AI Coach handles all coaching logic
 */
export type UserRole = 'athlete' | 'admin';

/**
 * Data source for wellness entries - tracks how data entered the system
 * Used for AI agent audit trail
 */
export type DataSource = 'apple_health' | 'manual_slider' | 'agent_voice';

/**
 * Movement categories for exercise classification (flexible string, not enforced at DB level)
 */

/**
 * Exercise type for determining how the exercise is performed
 */
export type ExerciseType = 'dynamic' | 'isometric' | 'eccentric';

/**
 * Benchmark units - supports unit-agnostic tracking for various exercise types
 */
export type BenchmarkUnit = 'kg' | 'lbs' | 'seconds' | 'reps' | 'meters';

// ============================================================================
// Table Interfaces
// ============================================================================

/**
 * Tenant Settings - Global configuration for each tenant/organization
 * Primary key is the tenant_id itself
 */
export interface TenantSettingsTable {
  tenant_id: string; // PK
  organization_name: string;
  timezone: string;
  default_barbell_rounding: number; // e.g., 2.5 for kg plates
}

/**
 * User - Athletes who interact with the AI Coach
 * Uses RedwoodSDK Passkey Addon for passwordless authentication
 */
export interface UserTable {
  id: Generated<string>;
  tenant_id: string; // FK to TenantSettings (required for user data)
  external_auth_id: string | null; // For RedwoodSDK Passkeys
  email: string;
  role: UserRole;
  is_active: Generated<number>; // SQLite boolean: 0 or 1
  display_name: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'prefer_not_to_say' | null;
  height_cm: number | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

/**
 * Daily Wellness - Captures athlete readiness metrics
 * Used by AI Coach to calculate ACWR and govern daily intensity
 */
export interface DailyWellnessTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  date: string; // ISO date string YYYY-MM-DD
  // Objective metrics
  rhr: number; // Resting Heart Rate
  hrv_rmssd: number; // Heart Rate Variability (RMSSD)
  // Subjective metrics (1-5 sliders)
  sleep_score: number | null;
  diet_score: number | null;
  mood_score: number | null;
  muscle_soreness_score: number | null;
  stress_score: number | null;
  fatigue_score: number | null;
  body_weight: number | null;
  // Audit trail for data entry method
  data_source: Generated<DataSource>;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

/**
 * User Benchmark - Tracks dynamic training maximums and metrics
 * Supports Wendler 5/3/1 scaling via training_max_percentage
 */
export interface UserBenchmarkTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  benchmark_name: string; // e.g., 'Squat', 'Max Reps PU'
  benchmark_value: number | null;
  benchmark_unit: BenchmarkUnit | null;
  training_max_percentage: Generated<number>; // Defaults to 100.0 (5/3/1 support)
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

/**
 * Exercise Dictionary - Global library of exercises
 * Hybrid Multi-Tenant: tenant_id NULL = System Template (global)
 */
export interface ExerciseDictionaryTable {
  id: Generated<string>;
  tenant_id: string | null; // NULL for global system templates
  name: string;
  movement_category: string; // Flexible string to support hybrid training modalities
  exercise_type: ExerciseType;
  benchmark_target: string | null; // Links to UserBenchmark.benchmark_name
  conversion_factor: number | null; // e.g., 0.70 for Goblet Squat -> Squat
  percent_bodyweight_used: number;
  equipment_type: string | null;
  rounding_increment: number;
  notes: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

/**
 * Training Plan - Top-level periodization container
 * Hybrid Multi-Tenant: tenant_id NULL = System Template (global library)
 */
export interface TrainingPlanTable {
  id: Generated<string>;
  tenant_id: string | null; // NULL for global system templates
  name: string; // e.g., 'Hypertrophy Block 1'
  is_system_template: Generated<number>; // SQLite boolean: 0 or 1
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

/**
 * Training Session - Individual workout session within a plan
 * Flattened periodization: TrainingPlan -> TrainingSession -> SessionExercise
 */
export interface TrainingSessionTable {
  id: Generated<string>;
  tenant_id: string | null;
  plan_id: string; // FK to TrainingPlan
  block_name: string | null; // e.g., 'Hypertrophy', 'Strength'
  week_number: number | null;
  day_of_week: string | null; // e.g., 'Monday'
  session_name: string | null; // e.g., 'Power Day'
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

/**
 * Session Exercise - Individual exercise within a training session
 * Circuit groups managed via string rather than deep nested tables
 */
export interface SessionExerciseTable {
  id: Generated<string>;
  tenant_id: string | null;
  session_id: string; // FK to TrainingSession
  exercise_dictionary_id: string; // FK to ExerciseDictionary
  circuit_group: string | null; // Groups supersets: 'A', 'B', 'Warmup'
  order_in_session: number;
  scheme_name: string | null; // e.g., 'Constant Wave 2x8/6/4'
  prescribed_rest_min: number | null;
  prescribed_rest_max: number | null;
  coach_notes: string | null; // AI or coach instructions
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

/**
 * Exercise Set - Set-level prescription and execution tracking
 * Child of SessionExercise for per-set precision
 */
export interface ExerciseSetTable {
  id: Generated<string>;
  tenant_id: string;
  session_exercise_id: string; // FK to SessionExercise
  set_number: number;
  // Template Math
  conversion_factor: number | null; // Intra-session step-up percentage
  // The Prescription (AI Calculated)
  prescribed_reps_min: number | null;
  prescribed_reps_max: number | null;
  prescribed_weight: number | null;
  // The Execution (Athlete/Voice Logged)
  actual_reps: number | null;
  actual_weight: number | null;
  actual_rest_seconds: number | null;
  rpe: number | null;
  is_voice_entry: Generated<number>; // SQLite boolean
  is_completed: Generated<number>; // SQLite boolean
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

/**
 * Workout Session - Actual workout performed by athlete
 * Links to planned session for adherence tracking
 * Contains AI agent audit fields for voice-to-DB pipeline
 */
export interface WorkoutSessionTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  planned_session_id: string | null; // FK to TrainingSession (links actual to planned)
  date: string; // ISO date string YYYY-MM-DD
  // Adherence tracking
  completed_as_planned: Generated<number>; // SQLite boolean: 0 or 1
  // AI Agent audit trail
  is_voice_entry: Generated<number>; // SQLite boolean: 0 or 1 (True if modified via Pi Agent Voice)
  agent_interaction_log: string | null; // JSON audit log of Pi Agent's modifications
  // Workout metrics
  duration_minutes: number;
  srpe: number; // Session RPE (1-10)
  training_load: number; // duration_minutes * srpe
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

/**
 * Onboarding and Training Types
 */
export type TrainingStatus = 'untrained' | 'detrained' | 'trained';
export type PrimaryGoal = 'fat_loss' | 'muscle_gain' | 'strength' | 'general_fitness' | 'sport_performance' | 'rehabilitation';
export type BioenergeticLimiter = 'Delivery' | 'Respiratory' | 'Utilization';

export interface AthleteProfileTable {
  id: string; // PK (corresponds to user_id, but explicitly defined)
  tenant_id: string;
  user_id: string; // UNIQUE FK to user
  training_status: TrainingStatus;
  training_age_years: Generated<number>;
  last_consistent_training_date: string | null;
  primary_goal: PrimaryGoal | null;
  training_days_per_week: Generated<number>;
  max_session_duration_minutes: Generated<number>;
  weekend_session_duration_minutes: number | null;
  bioenergetic_limiter: BioenergeticLimiter | null;
  sport_context: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export type InjurySeverity = 'mild' | 'moderate' | 'severe';
export type InjuryStatus = 'active' | 'recovered' | 'chronic';
export type BodyRegion = 'neck' | 'shoulder' | 'upper_back' | 'lower_back' | 'chest' | 'abdomen' | 'elbow' | 'wrist' | 'hand' | 'hip' | 'groin' | 'quadriceps' | 'hamstrings' | 'knee' | 'calf' | 'ankle' | 'foot' | 'other';

export interface InjuryHistoryTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string; // FK to user
  body_region: BodyRegion;
  injury_type: string;
  severity: InjurySeverity;
  status: InjuryStatus;
  date_occurred: string | null;
  contraindicated_movements: string | null;
  notes: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface EquipmentTable {
  id: Generated<string>;
  tenant_id: string | null; // NULL for global system templates
  name: string; // UNIQUE
  notes: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface AthleteEquipmentTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string; // FK to user
  equipment_id: string; // FK to equipment
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface ExerciseEquipmentTable {
  id: Generated<string>;
  tenant_id: string | null; // NULL for system templates
  exercise_dictionary_id: string; // FK to exercise_dictionary
  equipment_id: string; // FK to equipment
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

// ============================================================================
// Database Type
// ============================================================================

/**
 * Kysely Database type - strictly typed interface for all tables
 * Use this for type-safe query building
 */
export interface Database {
  tenant_settings: TenantSettingsTable;
  user: UserTable;
  daily_wellness: DailyWellnessTable;
  user_benchmarks: UserBenchmarkTable;
  exercise_dictionary: ExerciseDictionaryTable;
  training_plan: TrainingPlanTable;
  training_session: TrainingSessionTable;
  session_exercise: SessionExerciseTable;
  exercise_set: ExerciseSetTable;
  workout_session: WorkoutSessionTable;
  athlete_profile: AthleteProfileTable;
  injury_history: InjuryHistoryTable;
  equipment: EquipmentTable;
  athlete_equipment: AthleteEquipmentTable;
  exercise_equipment: ExerciseEquipmentTable;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Insert types for tables with auto-generated fields
 * Omit Generated<string> fields that are auto-created
 */
export type InsertableUser = Omit<
  UserTable,
  'id' | 'created_at' | 'updated_at' | 'is_active'
> & {
  is_active?: number;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'prefer_not_to_say' | null;
  height_cm?: number | null;
};

export type InsertableDailyWellness = Omit<
  DailyWellnessTable,
  'id' | 'created_at' | 'updated_at' | 'data_source'
> & {
  data_source?: DataSource;
};

export type InsertableUserBenchmark = Omit<
  UserBenchmarkTable,
  'id' | 'created_at' | 'updated_at' | 'training_max_percentage'
> & {
  training_max_percentage?: number;
};

export type InsertableExerciseDictionary = Omit<
  ExerciseDictionaryTable,
  'id' | 'created_at' | 'updated_at'
>;

export type InsertableTrainingPlan = Omit<
  TrainingPlanTable,
  'id' | 'created_at' | 'updated_at' | 'is_system_template'
> & {
  is_system_template?: number;
};

export type InsertableTrainingSession = Omit<
  TrainingSessionTable,
  'id' | 'created_at' | 'updated_at'
>;

export type InsertableSessionExercise = Omit<
  SessionExerciseTable,
  'id' | 'created_at' | 'updated_at'
>;

export type InsertableExerciseSet = Omit<
  ExerciseSetTable,
  'id' | 'created_at' | 'updated_at' | 'is_voice_entry' | 'is_completed'
> & {
  is_voice_entry?: number;
  is_completed?: number;
};

export type InsertableWorkoutSession = Omit<
  WorkoutSessionTable,
  'id' | 'created_at' | 'updated_at' | 'completed_as_planned' | 'is_voice_entry'
> & {
  completed_as_planned?: number;
  is_voice_entry?: number;
};

export type InsertableAthleteProfile = Omit<
  AthleteProfileTable,
  'created_at' | 'updated_at' | 'training_age_years' | 'training_days_per_week' | 'max_session_duration_minutes'
> & {
  training_age_years?: number;
  training_days_per_week?: number;
  max_session_duration_minutes?: number;
};

export type InsertableInjuryHistory = Omit<
  InjuryHistoryTable,
  'id' | 'created_at' | 'updated_at'
>;

export type InsertableEquipment = Omit<
  EquipmentTable,
  'id' | 'created_at' | 'updated_at'
>;

export type InsertableAthleteEquipment = Omit<
  AthleteEquipmentTable,
  'id' | 'created_at' | 'updated_at'
>;

export type InsertableExerciseEquipment = Omit<
  ExerciseEquipmentTable,
  'id' | 'created_at' | 'updated_at'
>;

export type InsertableTenantSettings = TenantSettingsTable;

/**
 * Helper type for nullable tenant_id (Hybrid Multi-Tenant pattern)
 * Use when creating system templates
 */
export type SystemTemplateTables =
  | ExerciseDictionaryTable
  | TrainingPlanTable
  | EquipmentTable
  | ExerciseEquipmentTable;

/**
 * Helper type for user-scoped tables (always have tenant_id and user_id)
 */
export type UserScopedTables =
  | DailyWellnessTable
  | UserBenchmarkTable
  | WorkoutSessionTable
  | AthleteProfileTable
  | InjuryHistoryTable
  | AthleteEquipmentTable;

