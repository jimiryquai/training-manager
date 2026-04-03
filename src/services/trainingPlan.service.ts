import type { Kysely } from 'kysely';
import type { Database } from '../db/schema';
import { wrapDatabaseError } from './errors';
import { createId, nowISO } from './helpers';
import {
  type SessionExerciseRecord,
  createSessionExercise,
  getSessionExercisesBySession,
} from './sessionExercise.service';
import {
  type TrainingSessionWithExercises,
  createTrainingSession,
  getTrainingSessionsByPlan,
} from './trainingSession.service';

// ============================================================================
// Training Plan Service
// ============================================================================

export interface CreateTrainingPlanInput {
  tenant_id: string | null; // NULL for global system templates
  name: string;
  is_system_template?: number;
}

export type TrainingPlanRecord = {
  id: string;
  tenant_id: string | null;
  name: string;
  is_system_template: number;
};

export async function createTrainingPlan(
  db: Kysely<Database>,
  input: CreateTrainingPlanInput
): Promise<TrainingPlanRecord | undefined> {
  return wrapDatabaseError('createTrainingPlan', async () => {
    const id = createId();
    const now = nowISO();

    const result = await db
      .insertInto('training_plan')
      .values({
        id,
        tenant_id: input.tenant_id,
        name: input.name,
        is_system_template: input.is_system_template ?? (input.tenant_id === null ? 1 : 0),
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface GetTrainingPlanInput {
  id: string;
  tenant_id?: string | null;
}

export async function getTrainingPlanById(
  db: Kysely<Database>,
  input: GetTrainingPlanInput
): Promise<TrainingPlanRecord | undefined> {
  return wrapDatabaseError('getTrainingPlanById', async () => {
    let query = db
      .selectFrom('training_plan')
      .where('id', '=', input.id);

    if (input.tenant_id !== undefined) {
      query = query.where('tenant_id', 'is', input.tenant_id);
    }

    return query.selectAll().executeTakeFirst();
  });
}

/**
 * Get all global system training plans
 * These are templates available to all users
 */
export async function getSystemTrainingPlans(
  db: Kysely<Database>
): Promise<TrainingPlanRecord[]> {
  return wrapDatabaseError('getSystemTrainingPlans', async () => {
    return db
      .selectFrom('training_plan')
      .where('tenant_id', 'is', null)
      .where('is_system_template', '=', 1)
      .selectAll()
      .execute();
  });
}

/**
 * Get training plans for a tenant (includes global + tenant-specific)
 */
export async function getTrainingPlansForTenant(
  db: Kysely<Database>,
  tenant_id: string
): Promise<TrainingPlanRecord[]> {
  return wrapDatabaseError('getTrainingPlansForTenant', async () => {
    return db
      .selectFrom('training_plan')
      .where(eb => eb.or([
        eb('tenant_id', 'is', null),
        eb('tenant_id', '=', tenant_id)
      ]))
      .selectAll()
      .execute();
  });
}

export interface UpdateTrainingPlanInput {
  id: string;
  tenant_id: string | null;
  name?: string;
}

export async function updateTrainingPlan(
  db: Kysely<Database>,
  input: UpdateTrainingPlanInput
): Promise<TrainingPlanRecord | undefined> {
  return wrapDatabaseError('updateTrainingPlan', async () => {
    const now = nowISO();
    const updates: Record<string, unknown> = { updated_at: now };

    if (input.name !== undefined) updates.name = input.name;

    const result = await db
      .updateTable('training_plan')
      .set(updates)
      .where('id', '=', input.id)
      .where('tenant_id', 'is', input.tenant_id)
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface DeleteTrainingPlanInput {
  id: string;
  tenant_id: string | null;
}

export async function deleteTrainingPlan(
  db: Kysely<Database>,
  input: DeleteTrainingPlanInput
): Promise<boolean> {
  return wrapDatabaseError('deleteTrainingPlan', async () => {
    const result = await db
      .deleteFrom('training_plan')
      .where('id', '=', input.id)
      .where('tenant_id', 'is', input.tenant_id)
      .executeTakeFirst();

    return result.numDeletedRows > 0;
  });
}

/**
 * Clone a system template to a user's tenant
 * This creates a private copy that can be customized
 */
export async function cloneTrainingPlanToTenant(
  db: Kysely<Database>,
  input: {
    plan_id: string;
    tenant_id: string;
    new_name?: string;
  }
): Promise<TrainingPlanRecord | undefined> {
  return wrapDatabaseError('cloneTrainingPlanToTenant', async () => {
    // SECURITY: Only allow cloning of system templates or tenant-owned plans
    // This prevents cross-tenant access by guessing UUIDs
    const sourcePlan = await db
      .selectFrom('training_plan')
      .where('id', '=', input.plan_id)
      .where(eb => eb.or([
        eb.and([eb('tenant_id', 'is', null), eb('is_system_template', '=', 1)]),
        eb('tenant_id', '=', input.tenant_id),
      ]))
      .selectAll()
      .executeTakeFirst();

    if (!sourcePlan) return undefined;

    // Get all sessions for the plan
    const sessions = await getTrainingSessionsByPlan(db, { plan_id: input.plan_id });

    // Create the cloned plan
    const clonedPlan = await createTrainingPlan(db, {
      tenant_id: input.tenant_id,
      name: input.new_name ?? `${sourcePlan.name} (Copy)`,
      is_system_template: 0,
    });

    if (!clonedPlan) return undefined;

    // OPTIMIZATION: Fetch all exercises for all sessions in one query
    // Reduces DB round-trips from N (one per session) to 1
    const sessionIds = sessions.map(s => s.id);
    const allExercises = sessionIds.length > 0
      ? await db
          .selectFrom('session_exercise')
          .where('session_id', 'in', sessionIds)
          .selectAll()
          .execute()
      : [];

    // Group exercises by their original session_id for efficient lookup
    const exercisesBySession = Map.groupBy(allExercises, e => e.session_id);

    // Clone all sessions and collect exercise insert data
    const exerciseInserts: Array<{
      id: string;
      tenant_id: string;
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
      created_at: string;
      updated_at: string;
    }> = [];

    for (const session of sessions) {
      const clonedSession = await createTrainingSession(db, {
        tenant_id: input.tenant_id,
        plan_id: clonedPlan.id,
        block_name: session.block_name,
        week_number: session.week_number,
        day_of_week: session.day_of_week,
        session_name: session.session_name,
      });

      if (clonedSession) {
        const exercises = exercisesBySession.get(session.id) ?? [];
        const now = nowISO();

        for (const exercise of exercises) {
          exerciseInserts.push({
            id: createId(),
            tenant_id: input.tenant_id,
            session_id: clonedSession.id,
            exercise_dictionary_id: exercise.exercise_dictionary_id,
            circuit_group: exercise.circuit_group,
            order_in_session: exercise.order_in_session,
            scheme_name: exercise.scheme_name,
            target_sets: exercise.target_sets,
            target_reps: exercise.target_reps,
            target_intensity: exercise.target_intensity,
            target_rpe: exercise.target_rpe,
            target_tempo: exercise.target_tempo,
            target_rest_seconds: exercise.target_rest_seconds,
            coach_notes: exercise.coach_notes,
            created_at: now,
            updated_at: now,
          });
        }
      }
    }

    // OPTIMIZATION: Batch insert exercises with max 5 records per query
    // D1 has a limit on SQL variables, so we batch to avoid "too many SQL variables" errors
    // Reduces DB round-trips from M (one per exercise) to ceil(M/5)
    const BATCH_SIZE = 5;
    for (let i = 0; i < exerciseInserts.length; i += BATCH_SIZE) {
      const batch = exerciseInserts.slice(i, i + BATCH_SIZE);
      await db
        .insertInto('session_exercise')
        .values(batch)
        .execute();
    }

    return clonedPlan;
  });
}

// ============================================================================
// Composite Types
// ============================================================================

// Re-export TrainingSessionWithExercises for consumers
export type { TrainingSessionWithExercises } from './trainingSession.service';

/**
 * Full training plan with all sessions and exercises
 */
export interface TrainingPlanWithSessions extends TrainingPlanRecord {
  sessions: TrainingSessionWithExercises[];
}

/**
 * Get a full training plan with all sessions and exercises
 */
export async function getFullTrainingPlan(
  db: Kysely<Database>,
  input: { id: string; tenant_id?: string | null }
): Promise<TrainingPlanWithSessions | undefined> {
  return wrapDatabaseError('getFullTrainingPlan', async () => {
    const plan = await getTrainingPlanById(db, input);
    if (!plan) return undefined;

    const sessions = await getTrainingSessionsByPlan(db, { plan_id: plan.id, tenant_id: input.tenant_id });
    const sessionsWithExercises: TrainingSessionWithExercises[] = [];

    for (const session of sessions) {
      const exercises = await getSessionExercisesBySession(db, { session_id: session.id, tenant_id: input.tenant_id });
      sessionsWithExercises.push({ ...session, exercises });
    }

    return { ...plan, sessions: sessionsWithExercises };
  });
}
