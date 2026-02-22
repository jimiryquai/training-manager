import { Generated, ColumnType } from 'kysely';

export type Modality = 'strength' | 'rowing' | 'running' | 'cycling' | 'swimming' | 'other';

export type MovementCategory = 'squat' | 'hinge' | 'push' | 'pull' | 'carry' | 'core' | 'cardio';

export type ExerciseType = 'dynamic' | 'isometric' | 'eccentric';
export type BenchmarkUnit = 'kg' | 'lbs' | 'seconds';

export interface UserTable {
  id: Generated<string>;
  email: string;
  tenant_id: string;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface DailyWellnessTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  date: string;
  rhr: number;
  hrv_rmssd: number;
  sleep_score: number | null;
  fatigue_score: number | null;
  muscle_soreness_score: number | null;
  stress_score: number | null;
  mood_score: number | null;
  diet_score: number | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface WorkoutSessionTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  date: string;
  modality: Modality;
  duration_minutes: number;
  srpe: number;
  training_load: number;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface ExerciseDictionaryTable {
  id: Generated<string>;
  tenant_id: string;
  name: string;
  movement_category: MovementCategory;
  progression_level: number;
  exercise_type: ExerciseType;
  benchmark_target: string | null;
  conversion_factor: number | null;
  master_exercise_id: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface UserBenchmarksTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  benchmark_name: string;
  benchmark_value: number | null;
  benchmark_unit: string | null;
  master_exercise_id: string | null;
  one_rep_max_weight: number | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface Database {
  user: UserTable;
  daily_wellness: DailyWellnessTable;
  workout_session: WorkoutSessionTable;
  exercise_dictionary: ExerciseDictionaryTable;
  user_benchmarks: UserBenchmarksTable;
}
