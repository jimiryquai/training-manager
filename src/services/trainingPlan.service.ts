import type { Kysely } from 'kysely';
import type { Database, TrainingPlanTable, TrainingSessionTable, SessionExerciseTable } from '../db/schema';

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
}

export interface GetTrainingPlanInput {
  id: string;
  tenant_id?: string | null;
}

export async function getTrainingPlanById(
  db: Kysely<Database>,
  input: GetTrainingPlanInput
): Promise<TrainingPlanRecord | undefined> {
  let query = db
    .selectFrom('training_plan')
    .where('id', '=', input.id);

  if (input.tenant_id !== undefined) {
    query = query.where('tenant_id', 'is', input.tenant_id);
  }

  return query.selectAll().executeTakeFirst();
}

/**
 * Get all global system training plans
 * These are templates available to all users
 */
export async function getSystemTrainingPlans(
  db: Kysely<Database>
): Promise<TrainingPlanRecord[]> {
  return db
    .selectFrom('training_plan')
    .where('tenant_id', 'is', null)
    .where('is_system_template', '=', 1)
    .selectAll()
    .execute();
}

/**
 * Get training plans for a tenant (includes global + tenant-specific)
 */
export async function getTrainingPlansForTenant(
  db: Kysely<Database>,
  tenant_id: string
): Promise<TrainingPlanRecord[]> {
  return db
    .selectFrom('training_plan')
    .where(eb => eb.or([
      eb('tenant_id', 'is', null),
      eb('tenant_id', '=', tenant_id)
    ]))
    .selectAll()
    .execute();
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
}

export interface DeleteTrainingPlanInput {
  id: string;
  tenant_id: string | null;
}

export async function deleteTrainingPlan(
  db: Kysely<Database>,
  input: DeleteTrainingPlanInput
): Promise<boolean> {
  const result = await db
    .deleteFrom('training_plan')
    .where('id', '=', input.id)
    .where('tenant_id', 'is', input.tenant_id)
    .executeTakeFirst();

  return result.numDeletedRows > 0;
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
}

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
}

export interface GetTrainingSessionInput {
  id: string;
  tenant_id?: string | null;
}

export async function getTrainingSessionById(
  db: Kysely<Database>,
  input: GetTrainingSessionInput
): Promise<TrainingSessionRecord | undefined> {
  let query = db
    .selectFrom('training_session')
    .where('id', '=', input.id);

  if (input.tenant_id !== undefined) {
    query = query.where('tenant_id', 'is', input.tenant_id);
  }

  return query.selectAll().executeTakeFirst();
}

export interface GetTrainingSessionsByPlanInput {
  plan_id: string;
}

export async function getTrainingSessionsByPlan(
  db: Kysely<Database>,
  input: GetTrainingSessionsByPlanInput
): Promise<TrainingSessionRecord[]> {
  return db
    .selectFrom('training_session')
    .where('plan_id', '=', input.plan_id)
    .orderBy('week_number', 'asc')
    .orderBy('day_of_week', 'asc')
    .selectAll()
    .execute();
}

export interface GetTrainingSessionsByWeekInput {
  plan_id: string;
  week_number: number;
}

export async function getTrainingSessionsByWeek(
  db: Kysely<Database>,
  input: GetTrainingSessionsByWeekInput
): Promise<TrainingSessionRecord[]> {
  return db
    .selectFrom('training_session')
    .where('plan_id', '=', input.plan_id)
    .where('week_number', '=', input.week_number)
    .orderBy('day_of_week', 'asc')
    .selectAll()
    .execute();
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
}

export interface DeleteTrainingSessionInput {
  id: string;
  tenant_id: string | null;
}

export async function deleteTrainingSession(
  db: Kysely<Database>,
  input: DeleteTrainingSessionInput
): Promise<boolean> {
  const result = await db
    .deleteFrom('training_session')
    .where('id', '=', input.id)
    .where('tenant_id', 'is', input.tenant_id)
    .executeTakeFirst();

  return result.numDeletedRows > 0;
}

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
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

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
}

export interface GetSessionExerciseInput {
  id: string;
  tenant_id?: string | null;
}

export async function getSessionExerciseById(
  db: Kysely<Database>,
  input: GetSessionExerciseInput
): Promise<SessionExerciseRecord | undefined> {
  let query = db
    .selectFrom('session_exercise')
    .where('id', '=', input.id);

  if (input.tenant_id !== undefined) {
    query = query.where('tenant_id', 'is', input.tenant_id);
  }

  return query.selectAll().executeTakeFirst();
}

export interface GetSessionExercisesBySessionInput {
  session_id: string;
}

export async function getSessionExercisesBySession(
  db: Kysely<Database>,
  input: GetSessionExercisesBySessionInput
): Promise<SessionExerciseRecord[]> {
  return db
    .selectFrom('session_exercise')
    .where('session_id', '=', input.session_id)
    .orderBy('order_in_session', 'asc')
    .selectAll()
    .execute();
}

/**
 * Get session exercises grouped by circuit_group
 * Returns a map of circuit group -> exercises
 */
export async function getSessionExercisesGrouped(
  db: Kysely<Database>,
  session_id: string
): Promise<Map<string | null, SessionExerciseRecord[]>> {
  const exercises = await getSessionExercisesBySession(db, { session_id });
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
  const now = new Date().toISOString();
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
}

export interface DeleteSessionExerciseInput {
  id: string;
  tenant_id: string | null;
}

export async function deleteSessionExercise(
  db: Kysely<Database>,
  input: DeleteSessionExerciseInput
): Promise<boolean> {
  const result = await db
    .deleteFrom('session_exercise')
    .where('id', '=', input.id)
    .where('tenant_id', 'is', input.tenant_id)
    .executeTakeFirst();

  return result.numDeletedRows > 0;
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
  const session = await getTrainingSessionById(db, input);
  if (!session) return undefined;

  const exercises = await getSessionExercisesBySession(db, { session_id: session.id });

  return { ...session, exercises };
}

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
  const plan = await getTrainingPlanById(db, input);
  if (!plan) return undefined;

  const sessions = await getTrainingSessionsByPlan(db, { plan_id: plan.id });
  const sessionsWithExercises: TrainingSessionWithExercises[] = [];

  for (const session of sessions) {
    const exercises = await getSessionExercisesBySession(db, { session_id: session.id });
    sessionsWithExercises.push({ ...session, exercises });
  }

  return { ...plan, sessions: sessionsWithExercises };
}
