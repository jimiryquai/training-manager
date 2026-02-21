import { Generated, ColumnType } from 'kysely';

export type Modality = 'strength' | 'rowing' | 'running' | 'cycling' | 'swimming' | 'other';

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

export interface Database {
  user: UserTable;
  daily_wellness: DailyWellnessTable;
  workout_session: WorkoutSessionTable;
}
