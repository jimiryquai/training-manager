import type { Kysely } from 'kysely';
import type { Database, AthleteProfileTable, TrainingStatus, PrimaryGoal, BioenergeticLimiter } from '../db/schema';
import { wrapDatabaseError } from './errors';
import { createId, nowISO } from './helpers';

export interface CreateAthleteProfileInput {
  id?: string;
  tenant_id: string;
  user_id: string;
  training_status: TrainingStatus;
  training_age_years?: number;
  last_consistent_training_date?: string | null;
  primary_goal?: PrimaryGoal | null;
  training_days_per_week?: number;
  max_session_duration_minutes?: number;
  weekend_session_duration_minutes?: number | null;
  bioenergetic_limiter?: BioenergeticLimiter | null;
  sport_context?: string | null;
}

export type AthleteProfileRecord = {
  id: string;
  tenant_id: string;
  user_id: string;
  training_status: TrainingStatus;
  training_age_years: number;
  last_consistent_training_date: string | null;
  primary_goal: PrimaryGoal | null;
  training_days_per_week: number;
  max_session_duration_minutes: number;
  weekend_session_duration_minutes: number | null;
  bioenergetic_limiter: BioenergeticLimiter | null;
  sport_context: string | null;
  created_at: string;
  updated_at: string;
};

export async function createAthleteProfile(
  db: Kysely<Database>,
  input: CreateAthleteProfileInput
): Promise<AthleteProfileRecord | undefined> {
  return wrapDatabaseError('createAthleteProfile', async () => {
    const id = input.id ?? createId();
    const now = nowISO();

    const result = await db
      .insertInto('athlete_profile')
      .values({
        id,
        tenant_id: input.tenant_id,
        user_id: input.user_id,
        training_status: input.training_status,
        training_age_years: input.training_age_years ?? 0,
        last_consistent_training_date: input.last_consistent_training_date ?? null,
        primary_goal: input.primary_goal ?? null,
        training_days_per_week: input.training_days_per_week ?? 3,
        max_session_duration_minutes: input.max_session_duration_minutes ?? 60,
        weekend_session_duration_minutes: input.weekend_session_duration_minutes ?? null,
        bioenergetic_limiter: input.bioenergetic_limiter ?? null,
        sport_context: input.sport_context ?? null,
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface GetAthleteProfileInput {
  id: string;
  tenant_id?: string;
}

export async function getAthleteProfileById(
  db: Kysely<Database>,
  input: GetAthleteProfileInput
): Promise<AthleteProfileRecord | undefined> {
  return wrapDatabaseError('getAthleteProfileById', async () => {
    let query = db.selectFrom('athlete_profile').where('id', '=', input.id);

    if (input.tenant_id !== undefined) {
      query = query.where('tenant_id', '=', input.tenant_id);
    }

    return query.selectAll().executeTakeFirst();
  });
}

export interface GetAthleteProfileByUserIdInput {
  user_id: string;
  tenant_id?: string;
}

export async function getAthleteProfileByUserId(
  db: Kysely<Database>,
  input: GetAthleteProfileByUserIdInput
): Promise<AthleteProfileRecord | undefined> {
  return wrapDatabaseError('getAthleteProfileByUserId', async () => {
    let query = db.selectFrom('athlete_profile').where('user_id', '=', input.user_id);

    if (input.tenant_id !== undefined) {
      query = query.where('tenant_id', '=', input.tenant_id);
    }

    return query.selectAll().executeTakeFirst();
  });
}

export interface UpdateAthleteProfileInput {
  id: string; // profile ID (or we can use user_id if we specify, but let's use PK ID)
  tenant_id: string;
  training_status?: TrainingStatus;
  training_age_years?: number;
  last_consistent_training_date?: string | null;
  primary_goal?: PrimaryGoal | null;
  training_days_per_week?: number;
  max_session_duration_minutes?: number;
  weekend_session_duration_minutes?: number | null;
  bioenergetic_limiter?: BioenergeticLimiter | null;
  sport_context?: string | null;
}

export async function updateAthleteProfile(
  db: Kysely<Database>,
  input: UpdateAthleteProfileInput
): Promise<AthleteProfileRecord | undefined> {
  return wrapDatabaseError('updateAthleteProfile', async () => {
    const now = nowISO();
    const updates: Record<string, unknown> = { updated_at: now };

    if (input.training_status !== undefined) updates.training_status = input.training_status;
    if (input.training_age_years !== undefined) updates.training_age_years = input.training_age_years;
    if (input.last_consistent_training_date !== undefined) updates.last_consistent_training_date = input.last_consistent_training_date;
    if (input.primary_goal !== undefined) updates.primary_goal = input.primary_goal;
    if (input.training_days_per_week !== undefined) updates.training_days_per_week = input.training_days_per_week;
    if (input.max_session_duration_minutes !== undefined) updates.max_session_duration_minutes = input.max_session_duration_minutes;
    if (input.weekend_session_duration_minutes !== undefined) updates.weekend_session_duration_minutes = input.weekend_session_duration_minutes;
    if (input.bioenergetic_limiter !== undefined) updates.bioenergetic_limiter = input.bioenergetic_limiter;
    if (input.sport_context !== undefined) updates.sport_context = input.sport_context;

    return db
      .updateTable('athlete_profile')
      .set(updates)
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id)
      .returningAll()
      .executeTakeFirst();
  });
}

export interface DeleteAthleteProfileInput {
  id: string;
  tenant_id: string;
}

export async function deleteAthleteProfile(
  db: Kysely<Database>,
  input: DeleteAthleteProfileInput
): Promise<boolean> {
  return wrapDatabaseError('deleteAthleteProfile', async () => {
    const result = await db
      .deleteFrom('athlete_profile')
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id)
      .executeTakeFirst();

    return result.numDeletedRows > 0;
  });
}
