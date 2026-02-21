import type { Kysely } from 'kysely';
import type { Database, DailyWellnessTable } from '../db/schema';

export interface CreateDailyWellnessInput {
  tenant_id: string;
  user_id: string;
  date: string;
  rhr: number;
  hrv_rmssd: number;
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
