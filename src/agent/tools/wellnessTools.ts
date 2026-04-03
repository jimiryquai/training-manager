/**
 * Wellness tool handlers for CoachAgent
 */

import type { ToolHandler, ToolContext, ToolParams } from './types';
import {
  createDailyWellnessViaAgent,
  getDailyWellnessByDate,
  getDailyWellnessByDateRange,
} from '../../services/dailyWellness.service';

/**
 * Log daily wellness metrics (HRV, RHR, sleep, mood, etc.)
 */
export const logWellness: ToolHandler = async (ctx: ToolContext, params: ToolParams) => {
  return createDailyWellnessViaAgent(ctx.db, {
    tenant_id: ctx.tenantId,
    user_id: ctx.userId,
    date: params.date as string,
    rhr: params.rhr as number,
    hrv_rmssd: params.hrv_rmssd as number,
    sleep_score: params.sleep_score as number | undefined,
    fatigue_score: params.fatigue_score as number | undefined,
    mood_score: params.mood_score as number | undefined,
    muscle_soreness_score: params.muscle_soreness_score as number | undefined,
    stress_score: params.stress_score as number | undefined,
    diet_score: params.diet_score as number | undefined,
  });
};

/**
 * Retrieve wellness data for a specific date or range
 */
export const getWellness: ToolHandler = async (ctx: ToolContext, params: ToolParams) => {
  if (params.start_date && params.end_date) {
    return getDailyWellnessByDateRange(ctx.db, {
      tenant_id: ctx.tenantId,
      user_id: ctx.userId,
      start_date: params.start_date as string,
      end_date: params.end_date as string,
    });
  }
  return getDailyWellnessByDate(ctx.db, {
    tenant_id: ctx.tenantId,
    user_id: ctx.userId,
    date: (params.date as string) || new Date().toISOString().split('T')[0],
  });
};
