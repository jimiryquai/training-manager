import type { Kysely } from 'kysely';
import type { Database, DailyWellnessTable } from '../db/schema';

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
}

export type DailyWellnessRecord = Omit<DailyWellnessTable, 'created_at' | 'updated_at' | 'id'> & {
  id: string;
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
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const hrv_ratio = calculateHrvRatio(input.hrv_rmssd, input.rhr);

  const result = await db
    .insertInto('daily_wellness')
    .values({
      id,
      ...input,
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
}

export async function upsertDailyWellness(
  db: Kysely<Database>,
  input: CreateDailyWellnessInput
): Promise<DailyWellnessRecord | undefined> {
  const now = new Date().toISOString();
  const hrv_ratio = calculateHrvRatio(input.hrv_rmssd, input.rhr);

  const existing = await getDailyWellnessByDate(db, input);
  
  if (existing) {
    const result = await db
      .updateTable('daily_wellness')
      .set({
        rhr: input.rhr,
        hrv_rmssd: input.hrv_rmssd,
        sleep_score: input.sleep_score ?? null,
        fatigue_score: input.fatigue_score ?? null,
        muscle_soreness_score: input.muscle_soreness_score ?? null,
        stress_score: input.stress_score ?? null,
        mood_score: input.mood_score ?? null,
        diet_score: input.diet_score ?? null,
        updated_at: now
      })
      .where('id', '=', existing.id)
      .returningAll()
      .executeTakeFirst();

    if (!result) return undefined;
    return {
      ...result,
      hrv_ratio
    };
  }

  return createDailyWellness(db, input);
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
}
