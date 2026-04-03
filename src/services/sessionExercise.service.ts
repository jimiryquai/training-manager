import type { Kysely } from 'kysely';
import type { Database } from '../db/schema';
import { wrapDatabaseError } from './errors';
import { createId, nowISO } from './helpers';

// ============================================================================
// Session Exercise Service
// ============================================================================

export interface CreateSessionExerciseInput {
  tenant_id: string | null;
  session_id: string;
  exercise_dictionary_id: string;
  circuit_group?: string | null;
  order_in_session: number;
  scheme_name?: string | null;
  target_sets?: number | null;
  target_reps?: string | null;
  target_intensity?: number | null;
  target_rpe?: number | null;
  target_tempo?: string | null;
  target_rest_seconds?: number | null;
  coach_notes?: string | null;
}

export type SessionExerciseRecord = {
  id: string;
  tenant_id: string | null;
  session_id: string;
  exercise_dictionary_id: string;
  circuit_group: string | null;
  order_in_session: number;
  scheme_name: string | null;
  target_sets: number | null;
  target_reps: string | null;
  target_intensity: number | null;
  target_rpe: number | null;
  target_tempo: string | null;
  target_rest_seconds: number | null;
  coach_notes: string | null;
};

export async function createSessionExercise(
  db: Kysely<Database>,
  input: CreateSessionExerciseInput
): Promise<SessionExerciseRecord | undefined> {
  return wrapDatabaseError('createSessionExercise', async () => {
    const id = createId();
    const now = nowISO();

    const result = await db
      .insertInto('session_exercise')
      .values({
        id,
        tenant_id: input.tenant_id,
        session_id: input.session_id,
        exercise_dictionary_id: input.exercise_dictionary_id,
        circuit_group: input.circuit_group ?? null,
        order_in_session: input.order_in_session,
        scheme_name: input.scheme_name ?? null,
        target_sets: input.target_sets ?? null,
        target_reps: input.target_reps ?? null,
        target_intensity: input.target_intensity ?? null,
        target_rpe: input.target_rpe ?? null,
        target_tempo: input.target_tempo ?? null,
        target_rest_seconds: input.target_rest_seconds ?? null,
        coach_notes: input.coach_notes ?? null,
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface GetSessionExerciseInput {
  id: string;
  tenant_id?: string | null;
}

export async function getSessionExerciseById(
  db: Kysely<Database>,
  input: GetSessionExerciseInput
): Promise<SessionExerciseRecord | undefined> {
  return wrapDatabaseError('getSessionExerciseById', async () => {
    let query = db
      .selectFrom('session_exercise')
      .where('id', '=', input.id);

    if (input.tenant_id !== undefined) {
      query = query.where('tenant_id', 'is', input.tenant_id);
    }

    return query.selectAll().executeTakeFirst();
  });
}

export interface GetSessionExercisesBySessionInput {
  session_id: string;
  tenant_id?: string | null;
}

export async function getSessionExercisesBySession(
  db: Kysely<Database>,
  input: GetSessionExercisesBySessionInput
): Promise<SessionExerciseRecord[]> {
  return wrapDatabaseError('getSessionExercisesBySession', async () => {
    let query = db
      .selectFrom('session_exercise')
      .where('session_id', '=', input.session_id);

    if (input.tenant_id !== undefined) {
      query = query.where('tenant_id', 'is', input.tenant_id);
    }

    return query
      .orderBy('order_in_session', 'asc')
      .selectAll()
      .execute();
  });
}

/**
 * Get session exercises grouped by circuit_group
 * Returns a map of circuit group -> exercises
 */
export async function getSessionExercisesGrouped(
  db: Kysely<Database>,
  input: { session_id: string; tenant_id?: string | null }
): Promise<Map<string | null, SessionExerciseRecord[]>> {
  const exercises = await getSessionExercisesBySession(db, { session_id: input.session_id, tenant_id: input.tenant_id });
  const grouped = new Map<string | null, SessionExerciseRecord[]>();

  for (const exercise of exercises) {
    const group = exercise.circuit_group;
    if (!grouped.has(group)) {
      grouped.set(group, []);
    }
    grouped.get(group)!.push(exercise);
  }

  return grouped;
}

export interface UpdateSessionExerciseInput {
  id: string;
  tenant_id: string | null;
  circuit_group?: string | null;
  order_in_session?: number;
  scheme_name?: string | null;
  target_sets?: number | null;
  target_reps?: string | null;
  target_intensity?: number | null;
  target_rpe?: number | null;
  target_tempo?: string | null;
  target_rest_seconds?: number | null;
  coach_notes?: string | null;
}

export async function updateSessionExercise(
  db: Kysely<Database>,
  input: UpdateSessionExerciseInput
): Promise<SessionExerciseRecord | undefined> {
  return wrapDatabaseError('updateSessionExercise', async () => {
    const now = nowISO();
    const updates: Record<string, unknown> = { updated_at: now };

    if (input.circuit_group !== undefined) updates.circuit_group = input.circuit_group;
    if (input.order_in_session !== undefined) updates.order_in_session = input.order_in_session;
    if (input.scheme_name !== undefined) updates.scheme_name = input.scheme_name;
    if (input.target_sets !== undefined) updates.target_sets = input.target_sets;
    if (input.target_reps !== undefined) updates.target_reps = input.target_reps;
    if (input.target_intensity !== undefined) updates.target_intensity = input.target_intensity;
    if (input.target_rpe !== undefined) updates.target_rpe = input.target_rpe;
    if (input.target_tempo !== undefined) updates.target_tempo = input.target_tempo;
    if (input.target_rest_seconds !== undefined) updates.target_rest_seconds = input.target_rest_seconds;
    if (input.coach_notes !== undefined) updates.coach_notes = input.coach_notes;

    const result = await db
      .updateTable('session_exercise')
      .set(updates)
      .where('id', '=', input.id)
      .where('tenant_id', 'is', input.tenant_id)
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface DeleteSessionExerciseInput {
  id: string;
  tenant_id: string | null;
}

export async function deleteSessionExercise(
  db: Kysely<Database>,
  input: DeleteSessionExerciseInput
): Promise<boolean> {
  return wrapDatabaseError('deleteSessionExercise', async () => {
    const result = await db
      .deleteFrom('session_exercise')
      .where('id', '=', input.id)
      .where('tenant_id', 'is', input.tenant_id)
      .executeTakeFirst();

    return result.numDeletedRows > 0;
  });
}
