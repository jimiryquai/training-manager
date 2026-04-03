import type { Kysely } from 'kysely';
import type { Database } from '../db/schema';
import { wrapDatabaseError } from './errors';
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
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

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
    const now = new Date().toISOString();
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
    const sourcePlan = await getTrainingPlanById(db, { id: input.plan_id });
    
    if (!sourcePlan) return undefined;

    // Get all sessions and exercises for the plan
    const sessions = await getTrainingSessionsByPlan(db, { plan_id: input.plan_id });

    // Create the cloned plan
    const clonedPlan = await createTrainingPlan(db, {
      tenant_id: input.tenant_id,
      name: input.new_name ?? `${sourcePlan.name} (Copy)`,
      is_system_template: 0,
    });

    if (!clonedPlan) return undefined;

    // Clone all sessions and their exercises
    for (const session of sessions) {
      const exercises = await getSessionExercisesBySession(db, { session_id: session.id });
      
      const clonedSession = await createTrainingSession(db, {
        tenant_id: input.tenant_id,
        plan_id: clonedPlan.id,
        block_name: session.block_name,
        week_number: session.week_number,
        day_of_week: session.day_of_week,
        session_name: session.session_name,
      });

      if (clonedSession) {
        for (const exercise of exercises) {
          await createSessionExercise(db, {
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
          });
        }
      }
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
