import { z } from 'zod';
import { router } from '../trpc';
import { protectedProcedure } from '../trpc';
import {
  createDailyWellness,
  upsertDailyWellness,
  getDailyWellnessByDate,
  getDailyWellnessByDateRange,
  createDailyWellnessViaAgent,
} from '../../services/dailyWellness.service';
import type { DataSource } from '../../db/schema';

const dataSourceSchema = z.enum(['apple_health', 'manual_slider', 'agent_voice']);

const logDailyMetricsSchema = z.object({
  date: z.string(),
  rhr: z.number().positive(),
  hrv_rmssd: z.number().positive(),
  sleep_score: z.number().int().min(1).max(5).optional(),
  fatigue_score: z.number().int().min(1).max(5).optional(),
  muscle_soreness_score: z.number().int().min(1).max(5).optional(),
  stress_score: z.number().int().min(1).max(5).optional(),
  mood_score: z.number().int().min(1).max(5).optional(),
  diet_score: z.number().int().min(1).max(5).optional(),
  data_source: dataSourceSchema.optional(),
});

const getMetricsByDateSchema = z.object({
  date: z.string(),
});

const getMetricsByDateRangeSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
});

// Schema for AI Agent voice entry
const logDailyMetricsViaAgentSchema = z.object({
  date: z.string(),
  rhr: z.number().positive().optional(),
  hrv_rmssd: z.number().positive().optional(),
  sleep_score: z.number().int().min(1).max(5).optional(),
  fatigue_score: z.number().int().min(1).max(5).optional(),
  muscle_soreness_score: z.number().int().min(1).max(5).optional(),
  stress_score: z.number().int().min(1).max(5).optional(),
  mood_score: z.number().int().min(1).max(5).optional(),
  diet_score: z.number().int().min(1).max(5).optional(),
});

export const wellnessRouter = router({
  logDailyMetrics: protectedProcedure
    .input(logDailyMetricsSchema)
    .mutation(async ({ ctx, input }) => {
      return upsertDailyWellness(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        date: input.date,
        rhr: input.rhr,
        hrv_rmssd: input.hrv_rmssd,
        sleep_score: input.sleep_score,
        fatigue_score: input.fatigue_score,
        muscle_soreness_score: input.muscle_soreness_score,
        stress_score: input.stress_score,
        mood_score: input.mood_score,
        diet_score: input.diet_score,
        data_source: input.data_source as DataSource | undefined,
      });
    }),

  getMetricsByDate: protectedProcedure
    .input(getMetricsByDateSchema)
    .query(async ({ ctx, input }) => {
      return getDailyWellnessByDate(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        date: input.date,
      });
    }),

  getMetricsByDateRange: protectedProcedure
    .input(getMetricsByDateRangeSchema)
    .query(async ({ ctx, input }) => {
      return getDailyWellnessByDateRange(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        start_date: input.start_date,
        end_date: input.end_date,
      });
    }),

  // AI Agent procedure for voice-to-DB pipeline
  logDailyMetricsViaAgent: protectedProcedure
    .input(logDailyMetricsViaAgentSchema)
    .mutation(async ({ ctx, input }) => {
      // For agent entries, we need at least some wellness data
      // If objective metrics aren't provided, use defaults
      const rhr = input.rhr ?? 50;
      const hrv_rmssd = input.hrv_rmssd ?? 50;

      return createDailyWellnessViaAgent(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        date: input.date,
        rhr,
        hrv_rmssd,
        sleep_score: input.sleep_score,
        fatigue_score: input.fatigue_score,
        muscle_soreness_score: input.muscle_soreness_score,
        stress_score: input.stress_score,
        mood_score: input.mood_score,
        diet_score: input.diet_score,
      });
    }),
});
