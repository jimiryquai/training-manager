import type { Kysely } from 'kysely';
import type { Database } from '../db/schema';
import { getWorkoutSessionsByDateRange, type WorkoutSessionRecord } from './workoutSession.service';

export interface ACWRInput {
  tenant_id: string;
  user_id?: string;
  date: string;
}

export interface ACWRResult {
  acute_load: number;
  chronic_load: number;
  ratio: number;
  isDanger: boolean;
}

export function isDangerZone(ratio: number): boolean {
  return ratio > 1.5;
}

export function calculateAcuteLoad(
  sessions: Array<{ date: string; training_load: number }>,
  referenceDate: string
): number {
  const refDate = new Date(referenceDate);
  const sevenDaysAgo = new Date(refDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  return sessions
    .filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= sevenDaysAgo && sessionDate <= refDate;
    })
    .reduce((sum, s) => sum + s.training_load, 0);
}

export function calculateChronicLoad(
  sessions: Array<{ date: string; training_load: number }>,
  referenceDate: string
): number {
  const refDate = new Date(referenceDate);
  const twentyEightDaysAgo = new Date(refDate);
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 27);

  const totalLoad = sessions
    .filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= twentyEightDaysAgo && sessionDate <= refDate;
    })
    .reduce((sum, s) => sum + s.training_load, 0);

  return totalLoad / 4;
}

export async function calculateACWR(
  db: Kysely<Database>,
  input: ACWRInput
): Promise<ACWRResult> {
  const refDate = new Date(input.date);

  const acuteStartDate = new Date(refDate);
  acuteStartDate.setDate(acuteStartDate.getDate() - 6);

  const chronicStartDate = new Date(refDate);
  chronicStartDate.setDate(chronicStartDate.getDate() - 27);

  const acuteSessions = await getWorkoutSessionsByDateRange(db, {
    tenant_id: input.tenant_id,
    start_date: acuteStartDate.toISOString().split('T')[0],
    end_date: input.date,
    user_id: input.user_id
  });

  const chronicSessions = await getWorkoutSessionsByDateRange(db, {
    tenant_id: input.tenant_id,
    start_date: chronicStartDate.toISOString().split('T')[0],
    end_date: input.date,
    user_id: input.user_id
  });

  const acute_load = calculateAcuteLoad(acuteSessions, input.date);
  const chronic_load = calculateChronicLoad(chronicSessions, input.date);

  const ratio = chronic_load === 0 ? 0 : acute_load / chronic_load;

  return {
    acute_load,
    chronic_load,
    ratio,
    isDanger: isDangerZone(ratio)
  };
}
