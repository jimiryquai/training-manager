import { z } from 'zod';
import { router } from '../trpc';
import { protectedProcedure } from '../trpc';
import { createDailyWellness, getDailyWellnessByDate } from '../../services/dailyWellness.service';

const logDailyMetricsSchema = z.object({
  date: z.string(),
  rhr: z.number().positive(),
  hrv_rmssd: z.number().positive(),
});

const getMetricsByDateSchema = z.object({
  date: z.string(),
});

export const wellnessRouter = router({
  logDailyMetrics: protectedProcedure
    .input(logDailyMetricsSchema)
    .mutation(async ({ ctx, input }) => {
      return createDailyWellness(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        date: input.date,
        rhr: input.rhr,
        hrv_rmssd: input.hrv_rmssd,
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
});
