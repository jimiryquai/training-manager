import type { Kysely } from 'kysely';
import type { Database } from '../db/schema';
import { getWorkoutSessionsByDateRange, type WorkoutSessionRecord } from './workoutSession.service';

export interface ACWRInput {
  tenant_id: string;
  user_id?: string;
  date: string;
}

export interface ACWRResult {
  date: string;
  acute_load: number;
  chronic_load: number;
  ratio: number;
  isDanger: boolean;
}

/**
 * Check if ACWR is in the danger zone (>1.5)
 * Indicates high injury risk
 */
export function isDangerZone(ratio: number): boolean {
  return ratio > 1.5;
}

/**
 * Check if ACWR is in the optimal training zone (0.8 - 1.3)
 */
export function isOptimalZone(ratio: number): boolean {
  return ratio >= 0.8 && ratio <= 1.3;
}

/**
 * Check if ACWR indicates under-training (<0.8)
 */
export function isUnderTrainingZone(ratio: number): boolean {
  return ratio < 0.8;
}

/**
 * Calculate acute load (7-day sum) for a specific reference date
 * Acute load = sum of training loads from the 7 days ending on reference date
 */
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

/**
 * Calculate chronic load (28-day average) for a specific reference date
 * Chronic load = average of 4 x 7-day blocks (28-day total / 4)
 */
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

/**
 * Calculate ACWR for a single point in time
 * Returns the acute load, chronic load, ratio, and danger flag
 */
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
    date: input.date,
    acute_load,
    chronic_load,
    ratio,
    isDanger: isDangerZone(ratio)
  };
}

// ============================================================================
// Historical ACWR Calculation (CRITICAL for Chart Data)
// ============================================================================

export interface HistoricalACWRInput {
  tenant_id: string;
  user_id?: string;
  start_date: string;
  end_date: string;
}

export interface HistoricalACWRPoint {
  date: string;
  acute_load: number;
  chronic_load: number;
  ratio: number;
  isDanger: boolean;
  isOptimal: boolean;
  isUnderTraining: boolean;
  session_count: number;
}

/**
 * Calculate historical ACWR for each day in a date range
 * 
 * CRITICAL: This calculates the ACWR for EACH SPECIFIC DAY using only
 * sessions up to and including that day. This ensures accurate historical
 * charting rather than applying the current day's ratio to all days.
 * 
 * @param db - Kysely database instance
 * @param input - Date range and user/tenant filters
 * @returns Array of ACWR points, one per day in the range
 */
export async function calculateHistoricalACWR(
  db: Kysely<Database>,
  input: HistoricalACWRInput
): Promise<HistoricalACWRPoint[]> {
  const startDate = new Date(input.start_date);
  const endDate = new Date(input.end_date);

  // We need to fetch sessions from 27 days before start_date to cover the chronic window
  const chronicLookbackStart = new Date(startDate);
  chronicLookbackStart.setDate(chronicLookbackStart.getDate() - 27);

  // Fetch all sessions needed for the entire range
  const allSessions = await getWorkoutSessionsByDateRange(db, {
    tenant_id: input.tenant_id,
    start_date: chronicLookbackStart.toISOString().split('T')[0],
    end_date: input.end_date,
    user_id: input.user_id
  });

  // Create a map of date -> sessions for efficient lookup
  const sessionsByDate = new Map<string, Array<{ date: string; training_load: number }>>();
  for (const session of allSessions) {
    const dateKey = session.date;
    if (!sessionsByDate.has(dateKey)) {
      sessionsByDate.set(dateKey, []);
    }
    sessionsByDate.get(dateKey)!.push(session);
  }

  const results: HistoricalACWRPoint[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // For each day, calculate ACWR using only sessions up to and including that day
    const acute_load = calculateAcuteLoad(allSessions, dateStr);
    const chronic_load = calculateChronicLoad(allSessions, dateStr);
    const ratio = chronic_load === 0 ? 0 : acute_load / chronic_load;
    
    // Count sessions on this specific day
    const daySessions = sessionsByDate.get(dateStr) ?? [];
    
    results.push({
      date: dateStr,
      acute_load,
      chronic_load,
      ratio,
      isDanger: isDangerZone(ratio),
      isOptimal: isOptimalZone(ratio),
      isUnderTraining: isUnderTrainingZone(ratio),
      session_count: daySessions.length
    });

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return results;
}

/**
 * Get ACWR trend summary for a date range
 * Useful for AI Coach to understand training patterns
 */
export interface ACWRTrendSummary {
  avg_ratio: number;
  max_ratio: number;
  min_ratio: number;
  days_in_danger_zone: number;
  days_in_optimal_zone: number;
  days_under_training: number;
  trend_direction: 'increasing' | 'decreasing' | 'stable';
}

export async function getACWRTrendSummary(
  db: Kysely<Database>,
  input: HistoricalACWRInput
): Promise<ACWRTrendSummary> {
  const historical = await calculateHistoricalACWR(db, input);
  
  if (historical.length === 0) {
    return {
      avg_ratio: 0,
      max_ratio: 0,
      min_ratio: 0,
      days_in_danger_zone: 0,
      days_in_optimal_zone: 0,
      days_under_training: 0,
      trend_direction: 'stable'
    };
  }

  const ratios = historical.map(h => h.ratio).filter(r => r > 0);
  
  const avg_ratio = ratios.length > 0 
    ? ratios.reduce((sum, r) => sum + r, 0) / ratios.length 
    : 0;
  
  const max_ratio = ratios.length > 0 ? Math.max(...ratios) : 0;
  const min_ratio = ratios.length > 0 ? Math.min(...ratios) : 0;

  const days_in_danger_zone = historical.filter(h => h.isDanger).length;
  const days_in_optimal_zone = historical.filter(h => h.isOptimal).length;
  const days_under_training = historical.filter(h => h.isUnderTraining).length;

  // Determine trend direction by comparing first half to second half
  let trend_direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
  
  if (ratios.length >= 4) {
    const midPoint = Math.floor(ratios.length / 2);
    const firstHalfAvg = ratios.slice(0, midPoint).reduce((sum, r) => sum + r, 0) / midPoint;
    const secondHalfAvg = ratios.slice(midPoint).reduce((sum, r) => sum + r, 0) / (ratios.length - midPoint);
    
    const diff = secondHalfAvg - firstHalfAvg;
    if (diff > 0.1) {
      trend_direction = 'increasing';
    } else if (diff < -0.1) {
      trend_direction = 'decreasing';
    }
  }

  return {
    avg_ratio,
    max_ratio,
    min_ratio,
    days_in_danger_zone,
    days_in_optimal_zone,
    days_under_training,
    trend_direction
  };
}
