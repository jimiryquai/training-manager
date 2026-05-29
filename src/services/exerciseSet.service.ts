import type { Kysely } from 'kysely';
import type { Database, ExerciseSetTable } from '../db/schema';
import { wrapDatabaseError } from './errors';
import { createId, nowISO } from './helpers';

export interface CreateExerciseSetInput {
  id?: string;
  tenant_id: string;
  session_exercise_id: string;
  set_number: number;
  conversion_factor?: number | null;
  prescribed_reps_min?: number | null;
  prescribed_reps_max?: number | null;
  prescribed_weight?: number | null;
  actual_reps?: number | null;
  actual_weight?: number | null;
  actual_rest_seconds?: number | null;
  rpe?: number | null;
  is_voice_entry?: number;
  is_completed?: number;
}

export type ExerciseSetRecord = {
  id: string;
  tenant_id: string;
  session_exercise_id: string;
  set_number: number;
  conversion_factor: number | null;
  prescribed_reps_min: number | null;
  prescribed_reps_max: number | null;
  prescribed_weight: number | null;
  actual_reps: number | null;
  actual_weight: number | null;
  actual_rest_seconds: number | null;
  rpe: number | null;
  is_voice_entry: number;
  is_completed: number;
  created_at: string;
  updated_at: string;
};

export async function createExerciseSet(
  db: Kysely<Database>,
  input: CreateExerciseSetInput
): Promise<ExerciseSetRecord | undefined> {
  return wrapDatabaseError('createExerciseSet', async () => {
    const id = input.id ?? createId();
    const now = nowISO();

    const result = await db
      .insertInto('exercise_set')
      .values({
        id,
        tenant_id: input.tenant_id,
        session_exercise_id: input.session_exercise_id,
        set_number: input.set_number,
        conversion_factor: input.conversion_factor ?? null,
        prescribed_reps_min: input.prescribed_reps_min ?? null,
        prescribed_reps_max: input.prescribed_reps_max ?? null,
        prescribed_weight: input.prescribed_weight ?? null,
        actual_reps: input.actual_reps ?? null,
        actual_weight: input.actual_weight ?? null,
        actual_rest_seconds: input.actual_rest_seconds ?? null,
        rpe: input.rpe ?? null,
        is_voice_entry: input.is_voice_entry ?? 0,
        is_completed: input.is_completed ?? 0,
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface GetExerciseSetInput {
  id: string;
  tenant_id?: string;
}

export async function getExerciseSetById(
  db: Kysely<Database>,
  input: GetExerciseSetInput
): Promise<ExerciseSetRecord | undefined> {
  return wrapDatabaseError('getExerciseSetById', async () => {
    let query = db.selectFrom('exercise_set').where('id', '=', input.id);

    if (input.tenant_id !== undefined) {
      query = query.where('tenant_id', '=', input.tenant_id);
    }

    return query.selectAll().executeTakeFirst();
  });
}

export interface GetExerciseSetsBySessionExerciseInput {
  session_exercise_id: string;
  tenant_id?: string;
}

export async function getExerciseSetsBySessionExercise(
  db: Kysely<Database>,
  input: GetExerciseSetsBySessionExerciseInput
): Promise<ExerciseSetRecord[]> {
  return wrapDatabaseError('getExerciseSetsBySessionExercise', async () => {
    let query = db
      .selectFrom('exercise_set')
      .where('session_exercise_id', '=', input.session_exercise_id);

    if (input.tenant_id !== undefined) {
      query = query.where('tenant_id', '=', input.tenant_id);
    }

    return query.orderBy('set_number', 'asc').selectAll().execute();
  });
}

export interface UpdateExerciseSetInput {
  id: string;
  tenant_id: string;
  set_number?: number;
  conversion_factor?: number | null;
  prescribed_reps_min?: number | null;
  prescribed_reps_max?: number | null;
  prescribed_weight?: number | null;
  actual_reps?: number | null;
  actual_weight?: number | null;
  actual_rest_seconds?: number | null;
  rpe?: number | null;
  is_voice_entry?: number;
  is_completed?: number;
}

export async function updateExerciseSet(
  db: Kysely<Database>,
  input: UpdateExerciseSetInput
): Promise<ExerciseSetRecord | undefined> {
  return wrapDatabaseError('updateExerciseSet', async () => {
    const now = nowISO();
    const updates: Record<string, unknown> = { updated_at: now };

    if (input.set_number !== undefined) updates.set_number = input.set_number;
    if (input.conversion_factor !== undefined) updates.conversion_factor = input.conversion_factor;
    if (input.prescribed_reps_min !== undefined) updates.prescribed_reps_min = input.prescribed_reps_min;
    if (input.prescribed_reps_max !== undefined) updates.prescribed_reps_max = input.prescribed_reps_max;
    if (input.prescribed_weight !== undefined) updates.prescribed_weight = input.prescribed_weight;
    if (input.actual_reps !== undefined) updates.actual_reps = input.actual_reps;
    if (input.actual_weight !== undefined) updates.actual_weight = input.actual_weight;
    if (input.actual_rest_seconds !== undefined) updates.actual_rest_seconds = input.actual_rest_seconds;
    if (input.rpe !== undefined) updates.rpe = input.rpe;
    if (input.is_voice_entry !== undefined) updates.is_voice_entry = input.is_voice_entry;
    if (input.is_completed !== undefined) updates.is_completed = input.is_completed;

    return db
      .updateTable('exercise_set')
      .set(updates)
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id)
      .returningAll()
      .executeTakeFirst();
  });
}

export interface DeleteExerciseSetInput {
  id: string;
  tenant_id: string;
}

export async function deleteExerciseSet(
  db: Kysely<Database>,
  input: DeleteExerciseSetInput
): Promise<boolean> {
  return wrapDatabaseError('deleteExerciseSet', async () => {
    const result = await db
      .deleteFrom('exercise_set')
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id)
      .executeTakeFirst();

    return result.numDeletedRows > 0;
  });
}
