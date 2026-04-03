import type { Kysely } from 'kysely';
import type { Database, DailyWellnessTable, DataSource } from '../db/schema';
import { wrapDatabaseError } from './errors';
import { createId, nowISO } from './helpers';

export interface CreateDailyWellnessInput {
  tenant_id: string;
  user_id: string;
  date: string;
  rhr: number;
  hrv_rmssd: number;
  sleep_score?: number | null;
  fatigue_score?: number | null;
  muscle_soreness_score?: number | null;
  stress_score?: number | null;
  mood_score?: number | null;
  diet_score?: number | null;
  data_source?: DataSource;
}

export type DailyWellnessRecord = {
  id: string;
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
  data_source: DataSource;
  hrv_ratio: number;
};

export function calculateHrvRatio(hrvRmssd: number, rhr: number): number {
  if (rhr === 0) return 0;
  return hrvRmssd / rhr;
}

export async function createDailyWellness(
  db: Kysely<Database>,
  input: CreateDailyWellnessInput
): Promise<DailyWellnessRecord | undefined> {
  return wrapDatabaseError('createDailyWellness', async () => {
    const id = createId();
    const now = nowISO();
    const hrv_ratio = calculateHrvRatio(input.hrv_rmssd, input.rhr);

    const result = await db
      .insertInto('daily_wellness')
      .values({
        id,
        tenant_id: input.tenant_id,
        user_id: input.user_id,
        date: input.date,
        rhr: input.rhr,
        hrv_rmssd: input.hrv_rmssd,
        sleep_score: input.sleep_score ?? null,
        fatigue_score: input.fatigue_score ?? null,
        muscle_soreness_score: input.muscle_soreness_score ?? null,
        stress_score: input.stress_score ?? null,
        mood_score: input.mood_score ?? null,
        diet_score: input.diet_score ?? null,
        data_source: input.data_source ?? 'manual_slider',
        created_at: now,
        updated_at: now
      })
      .returningAll()
      .executeTakeFirst();

    if (!result) return undefined;

    return {
      ...result,
      hrv_ratio
    };
  });
}

export async function upsertDailyWellness(
  db: Kysely<Database>,
  input: CreateDailyWellnessInput
): Promise<DailyWellnessRecord | undefined> {
  return wrapDatabaseError('upsertDailyWellness', async () => {
    const now = nowISO();
    const hrv_ratio = calculateHrvRatio(input.hrv_rmssd, input.rhr);
    const id = createId();

    // Use ON CONFLICT to eliminate TOCTOU race between read and write
    const result = await db
      .insertInto('daily_wellness')
      .values({
        id,
        tenant_id: input.tenant_id,
        user_id: input.user_id,
        date: input.date,
        rhr: input.rhr,
        hrv_rmssd: input.hrv_rmssd,
        sleep_score: input.sleep_score ?? null,
        fatigue_score: input.fatigue_score ?? null,
        muscle_soreness_score: input.muscle_soreness_score ?? null,
        stress_score: input.stress_score ?? null,
        mood_score: input.mood_score ?? null,
        diet_score: input.diet_score ?? null,
        data_source: input.data_source ?? 'manual_slider',
        created_at: now,
        updated_at: now
      })
      .onConflict((oc) => oc
        .columns(['tenant_id', 'user_id', 'date'])
        .doUpdateSet({
          rhr: input.rhr,
          hrv_rmssd: input.hrv_rmssd,
          sleep_score: input.sleep_score ?? null,
          fatigue_score: input.fatigue_score ?? null,
          muscle_soreness_score: input.muscle_soreness_score ?? null,
          stress_score: input.stress_score ?? null,
          mood_score: input.mood_score ?? null,
          diet_score: input.diet_score ?? null,
          data_source: input.data_source ?? 'manual_slider',
          updated_at: now,
        })
      )
      .returningAll()
      .executeTakeFirst();

    if (!result) return undefined;

    return {
      ...result,
      hrv_ratio
    };
  });
}

export interface GetDailyWellnessInput {
  tenant_id: string;
  user_id: string;
  date: string;
}

export async function getDailyWellnessByDate(
  db: Kysely<Database>,
  input: GetDailyWellnessInput
): Promise<DailyWellnessRecord | undefined> {
  return wrapDatabaseError('getDailyWellnessByDate', async () => {
    const result = await db
      .selectFrom('daily_wellness')
      .where('tenant_id', '=', input.tenant_id)
      .where('user_id', '=', input.user_id)
      .where('date', '=', input.date)
      .selectAll()
      .executeTakeFirst();

    if (!result) return undefined;

    return {
      ...result,
      hrv_ratio: calculateHrvRatio(result.hrv_rmssd, result.rhr)
    };
  });
}

export interface GetDailyWellnessRangeInput {
  tenant_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
}

export async function getDailyWellnessByDateRange(
  db: Kysely<Database>,
  input: GetDailyWellnessRangeInput
): Promise<DailyWellnessRecord[]> {
  return wrapDatabaseError('getDailyWellnessByDateRange', async () => {
    const results = await db
      .selectFrom('daily_wellness')
      .where('tenant_id', '=', input.tenant_id)
      .where('user_id', '=', input.user_id)
      .where('date', '>=', input.start_date)
      .where('date', '<=', input.end_date)
      .selectAll()
      .execute();

    return results.map(r => ({
      ...r,
      hrv_ratio: calculateHrvRatio(r.hrv_rmssd, r.rhr)
    }));
  });
}

/**
 * Create wellness entry via AI Agent voice input
 * Automatically sets data_source to 'agent_voice'
 */
export async function createDailyWellnessViaAgent(
  db: Kysely<Database>,
  input: Omit<CreateDailyWellnessInput, 'data_source'>
): Promise<DailyWellnessRecord | undefined> {
  return createDailyWellness(db, { ...input, data_source: 'agent_voice' });
}

// ============================================================================
// Update Operations
// ============================================================================

export interface UpdateDailyWellnessInput {
  id: string;
  tenant_id: string;
  user_id?: string;
  rhr?: number;
  hrv_rmssd?: number;
  sleep_score?: number | null;
  fatigue_score?: number | null;
  muscle_soreness_score?: number | null;
  stress_score?: number | null;
  mood_score?: number | null;
  diet_score?: number | null;
  data_source?: DataSource;
}

/**
 * Update an existing daily wellness entry
 * Only updates fields that are explicitly provided
 */
export async function updateDailyWellness(
  db: Kysely<Database>,
  input: UpdateDailyWellnessInput
): Promise<DailyWellnessRecord | undefined> {
  return wrapDatabaseError('updateDailyWellness', async () => {
    const now = nowISO();
    const updates: Record<string, unknown> = { updated_at: now };

    if (input.rhr !== undefined) updates.rhr = input.rhr;
    if (input.hrv_rmssd !== undefined) updates.hrv_rmssd = input.hrv_rmssd;
    if (input.sleep_score !== undefined) updates.sleep_score = input.sleep_score;
    if (input.fatigue_score !== undefined) updates.fatigue_score = input.fatigue_score;
    if (input.muscle_soreness_score !== undefined) updates.muscle_soreness_score = input.muscle_soreness_score;
    if (input.stress_score !== undefined) updates.stress_score = input.stress_score;
    if (input.mood_score !== undefined) updates.mood_score = input.mood_score;
    if (input.diet_score !== undefined) updates.diet_score = input.diet_score;
    if (input.data_source !== undefined) updates.data_source = input.data_source;

    let query = db
      .updateTable('daily_wellness')
      .set(updates)
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id);

    if (input.user_id !== undefined) {
      query = query.where('user_id', '=', input.user_id);
    }

    const result = await query.returningAll().executeTakeFirst();

    if (!result) return undefined;

    return {
      ...result,
      hrv_ratio: calculateHrvRatio(result.hrv_rmssd, result.rhr)
    };
  });
}

/**
 * Update wellness entry via AI Agent voice input
 * Automatically sets data_source to 'agent_voice'
 */
export async function updateDailyWellnessViaAgent(
  db: Kysely<Database>,
  input: Omit<UpdateDailyWellnessInput, 'data_source'>
): Promise<DailyWellnessRecord | undefined> {
  return updateDailyWellness(db, { ...input, data_source: 'agent_voice' });
}

// ============================================================================
// Delete Operations
// ============================================================================

export interface DeleteDailyWellnessInput {
  id: string;
  tenant_id: string;
  user_id?: string;
}

/**
 * Delete a daily wellness entry
 * Returns true if a record was deleted, false otherwise
 */
export async function deleteDailyWellness(
  db: Kysely<Database>,
  input: DeleteDailyWellnessInput
): Promise<boolean> {
  return wrapDatabaseError('deleteDailyWellness', async () => {
    let query = db
      .deleteFrom('daily_wellness')
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id);

    if (input.user_id !== undefined) {
      query = query.where('user_id', '=', input.user_id);
    }

    const result = await query.executeTakeFirst();

    return result.numDeletedRows > 0;
  });
}

export interface DeleteDailyWellnessByDateInput {
  tenant_id: string;
  user_id: string;
  date: string;
}

/**
 * Delete a daily wellness entry by date
 * Convenience method for deleting by natural key
 */
export async function deleteDailyWellnessByDate(
  db: Kysely<Database>,
  input: DeleteDailyWellnessByDateInput
): Promise<boolean> {
  return wrapDatabaseError('deleteDailyWellnessByDate', async () => {
    const result = await db
      .deleteFrom('daily_wellness')
      .where('tenant_id', '=', input.tenant_id)
      .where('user_id', '=', input.user_id)
      .where('date', '=', input.date)
      .executeTakeFirst();

    return result.numDeletedRows > 0;
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the most recent wellness entry for a user
 * Useful for AI Coach to understand current athlete state
 */
export async function getMostRecentWellness(
  db: Kysely<Database>,
  input: {
    tenant_id: string;
    user_id: string;
  }
): Promise<DailyWellnessRecord | undefined> {
  return wrapDatabaseError('getMostRecentWellness', async () => {
    const result = await db
      .selectFrom('daily_wellness')
      .where('tenant_id', '=', input.tenant_id)
      .where('user_id', '=', input.user_id)
      .orderBy('date', 'desc')
      .selectAll()
      .executeTakeFirst();

    if (!result) return undefined;

    return {
      ...result,
      hrv_ratio: calculateHrvRatio(result.hrv_rmssd, result.rhr)
    };
  });
}

/**
 * Calculate average wellness scores over a date range
 * Returns null for metrics with no data
 */
export async function getAverageWellnessScores(
  db: Kysely<Database>,
  input: GetDailyWellnessRangeInput
): Promise<{
  avg_rhr: number | null;
  avg_hrv_rmssd: number | null;
  avg_sleep_score: number | null;
  avg_diet_score: number | null;
  avg_mood_score: number | null;
  avg_muscle_soreness_score: number | null;
  avg_stress_score: number | null;
  avg_fatigue_score: number | null;
  entry_count: number;
}> {
  return wrapDatabaseError('getAverageWellnessScores', async () => {
    const results = await getDailyWellnessByDateRange(db, input);

    if (results.length === 0) {
      return {
        avg_rhr: null,
        avg_hrv_rmssd: null,
        avg_sleep_score: null,
        avg_diet_score: null,
        avg_mood_score: null,
        avg_muscle_soreness_score: null,
        avg_stress_score: null,
        avg_fatigue_score: null,
        entry_count: 0
      };
    }

    const sumNotNull = (arr: (number | null)[]): number => 
      arr.reduce((acc: number, val) => acc + (val ?? 0), 0);
    
    const countNotNull = (arr: (number | null)[]): number => 
      arr.filter(v => v !== null).length;

    const rhrValues = results.map(r => r.rhr);
    const hrvValues = results.map(r => r.hrv_rmssd);
    const sleepValues = results.map(r => r.sleep_score);
    const dietValues = results.map(r => r.diet_score);
    const moodValues = results.map(r => r.mood_score);
    const sorenessValues = results.map(r => r.muscle_soreness_score);
    const stressValues = results.map(r => r.stress_score);
    const fatigueValues = results.map(r => r.fatigue_score);

    const avgIfData = (values: (number | null)[]): number | null => {
      const count = countNotNull(values);
      return count > 0 ? sumNotNull(values) / count : null;
    };

    return {
      avg_rhr: sumNotNull(rhrValues) / rhrValues.length,
      avg_hrv_rmssd: sumNotNull(hrvValues) / hrvValues.length,
      avg_sleep_score: avgIfData(sleepValues),
      avg_diet_score: avgIfData(dietValues),
      avg_mood_score: avgIfData(moodValues),
      avg_muscle_soreness_score: avgIfData(sorenessValues),
      avg_stress_score: avgIfData(stressValues),
      avg_fatigue_score: avgIfData(fatigueValues),
      entry_count: results.length
    };
  });
}
