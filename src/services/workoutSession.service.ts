import type { Kysely } from 'kysely';
import type { Database, WorkoutSessionTable } from '../db/schema';
import { wrapDatabaseError } from './errors';

export interface CreateWorkoutSessionInput {
  tenant_id: string;
  user_id: string;
  date: string;
  planned_session_id?: string | null;
  duration_minutes: number;
  srpe: number;
  completed_as_planned?: number;
  is_voice_entry?: number;
  agent_interaction_log?: string | null;
}

export type WorkoutSessionRecord = {
  id: string;
  tenant_id: string;
  user_id: string;
  planned_session_id: string | null;
  date: string;
  completed_as_planned: number;
  is_voice_entry: number;
  agent_interaction_log: string | null;
  duration_minutes: number;
  srpe: number;
  training_load: number;
};

export function calculateTrainingLoad(durationMinutes: number, srpe: number): number {
  return durationMinutes * srpe;
}

export async function createWorkoutSession(
  db: Kysely<Database>,
  input: CreateWorkoutSessionInput
): Promise<WorkoutSessionRecord | undefined> {
  return wrapDatabaseError('createWorkoutSession', async () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const training_load = calculateTrainingLoad(input.duration_minutes, input.srpe);

    const result = await db
      .insertInto('workout_session')
      .values({
        id,
        tenant_id: input.tenant_id,
        user_id: input.user_id,
        date: input.date,
        planned_session_id: input.planned_session_id ?? null,
        duration_minutes: input.duration_minutes,
        srpe: input.srpe,
        training_load,
        completed_as_planned: input.completed_as_planned ?? 1,
        is_voice_entry: input.is_voice_entry ?? 0,
        agent_interaction_log: input.agent_interaction_log ?? null,
        created_at: now,
        updated_at: now
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface UpdateWorkoutSessionInput {
  id: string;
  tenant_id: string;
  duration_minutes?: number;
  srpe?: number;
  completed_as_planned?: number;
  is_voice_entry?: number;
  agent_interaction_log?: string | null;
}

export async function updateWorkoutSession(
  db: Kysely<Database>,
  input: UpdateWorkoutSessionInput
): Promise<WorkoutSessionRecord | undefined> {
  return wrapDatabaseError('updateWorkoutSession', async () => {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updated_at: now };

    if (input.duration_minutes !== undefined) {
      updates.duration_minutes = input.duration_minutes;
    }
    if (input.srpe !== undefined) {
      updates.srpe = input.srpe;
    }
    if (input.duration_minutes !== undefined || input.srpe !== undefined) {
      // Recalculate training load if either component changed
      const existing = await db
        .selectFrom('workout_session')
        .where('id', '=', input.id)
        .where('tenant_id', '=', input.tenant_id)
        .selectAll()
        .executeTakeFirst();
      
      if (existing) {
        const duration = input.duration_minutes ?? existing.duration_minutes;
        const srpe = input.srpe ?? existing.srpe;
        updates.training_load = calculateTrainingLoad(duration, srpe);
      }
    }
    if (input.completed_as_planned !== undefined) {
      updates.completed_as_planned = input.completed_as_planned;
    }
    if (input.is_voice_entry !== undefined) {
      updates.is_voice_entry = input.is_voice_entry;
    }
    if (input.agent_interaction_log !== undefined) {
      updates.agent_interaction_log = input.agent_interaction_log;
    }

    const result = await db
      .updateTable('workout_session')
      .set(updates)
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id)
      .returningAll()
      .executeTakeFirst();

    return result;
  });
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
  return wrapDatabaseError('getWorkoutSessionsByDateRange', async () => {
    let query = db
      .selectFrom('workout_session')
      .where('tenant_id', '=', input.tenant_id)
      .where('date', '>=', input.start_date)
      .where('date', '<=', input.end_date);

    if (input.user_id) {
      query = query.where('user_id', '=', input.user_id);
    }

    return query.selectAll().execute();
  });
}

export interface GetWorkoutSessionInput {
  id: string;
  tenant_id: string;
}

export async function getWorkoutSessionById(
  db: Kysely<Database>,
  input: GetWorkoutSessionInput
): Promise<WorkoutSessionRecord | undefined> {
  return wrapDatabaseError('getWorkoutSessionById', async () => {
    return db
      .selectFrom('workout_session')
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id)
      .selectAll()
      .executeTakeFirst();
  });
}

/**
 * Create workout session via AI Agent voice input
 * Automatically sets is_voice_entry to 1 and records agent interaction
 */
export async function createWorkoutSessionViaAgent(
  db: Kysely<Database>,
  input: Omit<CreateWorkoutSessionInput, 'is_voice_entry'> & {
    agent_reasoning: string;
  }
): Promise<WorkoutSessionRecord | undefined> {
  const agentLog = JSON.stringify({
    timestamp: new Date().toISOString(),
    action: 'create_workout_session',
    reasoning: input.agent_reasoning,
    original_input: {
      date: input.date,
      duration_minutes: input.duration_minutes,
      srpe: input.srpe,
      planned_session_id: input.planned_session_id
    }
  });

  return createWorkoutSession(db, {
    ...input,
    is_voice_entry: 1,
    agent_interaction_log: agentLog
  });
}

/**
 * Mark workout as modified via AI Agent voice input
 * Updates is_voice_entry and logs the interaction
 */
export async function markWorkoutAsVoiceEntry(
  db: Kysely<Database>,
  input: {
    id: string;
    tenant_id: string;
    agent_reasoning: string;
    modifications: Record<string, unknown>;
  }
): Promise<WorkoutSessionRecord | undefined> {
  const existing = await getWorkoutSessionById(db, {
    id: input.id,
    tenant_id: input.tenant_id
  });

  if (!existing) return undefined;

  const agentLog = JSON.stringify({
    timestamp: new Date().toISOString(),
    action: 'modify_workout_session',
    reasoning: input.agent_reasoning,
    modifications: input.modifications,
    previous_values: {
      duration_minutes: existing.duration_minutes,
      srpe: existing.srpe,
      completed_as_planned: existing.completed_as_planned
    }
  });

  // Append to existing log or create new one
  const combinedLog = existing.agent_interaction_log
    ? `${existing.agent_interaction_log}\n${agentLog}`
    : agentLog;

  return updateWorkoutSession(db, {
    id: input.id,
    tenant_id: input.tenant_id,
    is_voice_entry: 1,
    agent_interaction_log: combinedLog
  });
}

export interface DeleteWorkoutSessionInput {
  id: string;
  tenant_id: string;
}

export async function deleteWorkoutSession(
  db: Kysely<Database>,
  input: DeleteWorkoutSessionInput
): Promise<boolean> {
  return wrapDatabaseError('deleteWorkoutSession', async () => {
    const result = await db
      .deleteFrom('workout_session')
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id)
      .executeTakeFirst();

    return result.numDeletedRows > 0;
  });
}
