import type { Kysely } from 'kysely';
import type { Database, WorkoutSessionTable, Modality } from '../db/schema';

export interface CreateWorkoutSessionInput {
  tenant_id: string;
  user_id: string;
  date: string;
  modality: Modality;
  duration_minutes: number;
  srpe: number;
}

export type WorkoutSessionRecord = Omit<WorkoutSessionTable, 'created_at' | 'updated_at' | 'id'> & {
  id: string;
};

export function calculateTrainingLoad(durationMinutes: number, srpe: number): number {
  return durationMinutes * srpe;
}

export async function createWorkoutSession(
  db: Kysely<Database>,
  input: CreateWorkoutSessionInput
): Promise<WorkoutSessionRecord | undefined> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const training_load = calculateTrainingLoad(input.duration_minutes, input.srpe);

  const result = await db
    .insertInto('workout_session')
    .values({
      id,
      ...input,
      training_load,
      created_at: now,
      updated_at: now
    })
    .returningAll()
    .executeTakeFirst();

  return result;
}

export interface GetSessionsByDateRangeInput {
  tenant_id: string;
  start_date: string;
  end_date: string;
  user_id?: string;
}

export async function getWorkoutSessionsByDateRange(
  db: Kysely<Database>,
  input: GetSessionsByDateRangeInput
): Promise<WorkoutSessionRecord[]> {
  let query = db
    .selectFrom('workout_session')
    .where('tenant_id', '=', input.tenant_id)
    .where('date', '>=', input.start_date)
    .where('date', '<=', input.end_date);

  if (input.user_id) {
    query = query.where('user_id', '=', input.user_id);
  }

  return query.selectAll().execute();
}
