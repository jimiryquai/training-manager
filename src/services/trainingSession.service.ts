import type { Kysely } from 'kysely';
import type { Database } from '../db/schema';
import { wrapDatabaseError } from './errors';
import { type SessionExerciseRecord, getSessionExercisesBySession } from './sessionExercise.service';

// ============================================================================
// Training Session Service
// ============================================================================

export interface CreateTrainingSessionInput {
  tenant_id: string | null;
  plan_id: string;
  block_name?: string | null;
  week_number?: number | null;
  day_of_week?: string | null;
  session_name?: string | null;
}

export type TrainingSessionRecord = {
  id: string;
  tenant_id: string | null;
  plan_id: string;
  block_name: string | null;
  week_number: number | null;
  day_of_week: string | null;
  session_name: string | null;
};

export async function createTrainingSession(
  db: Kysely<Database>,
  input: CreateTrainingSessionInput
): Promise<TrainingSessionRecord | undefined> {
  return wrapDatabaseError('createTrainingSession', async () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const result = await db
      .insertInto('training_session')
      .values({
        id,
        tenant_id: input.tenant_id,
        plan_id: input.plan_id,
        block_name: input.block_name ?? null,
        week_number: input.week_number ?? null,
        day_of_week: input.day_of_week ?? null,
        session_name: input.session_name ?? null,
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface GetTrainingSessionInput {
  id: string;
  tenant_id?: string | null;
}

export async function getTrainingSessionById(
  db: Kysely<Database>,
  input: GetTrainingSessionInput
): Promise<TrainingSessionRecord | undefined> {
  return wrapDatabaseError('getTrainingSessionById', async () => {
    let query = db
      .selectFrom('training_session')
      .where('id', '=', input.id);

    if (input.tenant_id !== undefined) {
      query = query.where('tenant_id', 'is', input.tenant_id);
    }

    return query.selectAll().executeTakeFirst();
  });
}

export interface GetTrainingSessionsByPlanInput {
  plan_id: string;
  tenant_id?: string | null;
}

export async function getTrainingSessionsByPlan(
  db: Kysely<Database>,
  input: GetTrainingSessionsByPlanInput
): Promise<TrainingSessionRecord[]> {
  return wrapDatabaseError('getTrainingSessionsByPlan', async () => {
    let query = db
      .selectFrom('training_session')
      .where('plan_id', '=', input.plan_id);

    if (input.tenant_id !== undefined) {
      query = query.where('tenant_id', 'is', input.tenant_id);
    }

    return query
      .orderBy('week_number', 'asc')
      .orderBy('day_of_week', 'asc')
      .selectAll()
      .execute();
  });
}

export interface GetTrainingSessionsByWeekInput {
  plan_id: string;
  week_number: number;
  tenant_id?: string | null;
}

export async function getTrainingSessionsByWeek(
  db: Kysely<Database>,
  input: GetTrainingSessionsByWeekInput
): Promise<TrainingSessionRecord[]> {
  return wrapDatabaseError('getTrainingSessionsByWeek', async () => {
    let query = db
      .selectFrom('training_session')
      .where('plan_id', '=', input.plan_id)
      .where('week_number', '=', input.week_number);

    if (input.tenant_id !== undefined) {
      query = query.where('tenant_id', 'is', input.tenant_id);
    }

    return query
      .orderBy('day_of_week', 'asc')
      .selectAll()
      .execute();
  });
}

export interface UpdateTrainingSessionInput {
  id: string;
  tenant_id: string | null;
  block_name?: string | null;
  week_number?: number | null;
  day_of_week?: string | null;
  session_name?: string | null;
}

export async function updateTrainingSession(
  db: Kysely<Database>,
  input: UpdateTrainingSessionInput
): Promise<TrainingSessionRecord | undefined> {
  return wrapDatabaseError('updateTrainingSession', async () => {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updated_at: now };

    if (input.block_name !== undefined) updates.block_name = input.block_name;
    if (input.week_number !== undefined) updates.week_number = input.week_number;
    if (input.day_of_week !== undefined) updates.day_of_week = input.day_of_week;
    if (input.session_name !== undefined) updates.session_name = input.session_name;

    const result = await db
      .updateTable('training_session')
      .set(updates)
      .where('id', '=', input.id)
      .where('tenant_id', 'is', input.tenant_id)
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface DeleteTrainingSessionInput {
  id: string;
  tenant_id: string | null;
}

export async function deleteTrainingSession(
  db: Kysely<Database>,
  input: DeleteTrainingSessionInput
): Promise<boolean> {
  return wrapDatabaseError('deleteTrainingSession', async () => {
    const result = await db
      .deleteFrom('training_session')
      .where('id', '=', input.id)
      .where('tenant_id', 'is', input.tenant_id)
      .executeTakeFirst();

    return result.numDeletedRows > 0;
  });
}

// ============================================================================
// Composite Types
// ============================================================================

/**
 * Full training session with exercises populated
 */
export interface TrainingSessionWithExercises extends TrainingSessionRecord {
  exercises: SessionExerciseRecord[];
}

/**
 * Get a full training session with all exercises
 */
export async function getFullTrainingSession(
  db: Kysely<Database>,
  input: { id: string; tenant_id?: string | null }
): Promise<TrainingSessionWithExercises | undefined> {
  return wrapDatabaseError('getFullTrainingSession', async () => {
    const session = await getTrainingSessionById(db, input);
    if (!session) return undefined;

    const exercises = await getSessionExercisesBySession(db, { session_id: session.id, tenant_id: input.tenant_id });

    return { ...session, exercises };
  });
}
