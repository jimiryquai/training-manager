import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc';
import { createResolver } from '@nkzw/fate/server';
import { calculateAcuteLoad, calculateChronicLoad } from '../services/acwr.service';
import { getDailyWellnessByDateRange } from '../services/dailyWellness.service';
import { getWorkoutSessionsByDateRange } from '../services/workoutSession.service';
import { ReadinessView, type ACWRData, type WellnessMetric, type ACWRHistoryPoint } from './views';

const getReadinessViewSchema = z.object({
  date: z.string(),
  history_days: z.number().int().min(7).max(90).default(28),
  select: z.array(z.string()).optional(),
});

export const dashboardRouter = router({
  getReadinessView: protectedProcedure
    .input(getReadinessViewSchema)
    .query(async ({ ctx, input }) => {
      const endDate = new Date(input.date);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - input.history_days + 1);

      const chronicStartDate = new Date(endDate);
      chronicStartDate.setDate(chronicStartDate.getDate() - 27);

      const [wellnessHistory, allSessions] = await Promise.all([
        getDailyWellnessByDateRange(ctx.db, {
          tenant_id: ctx.tenantId,
          user_id: ctx.userId,
          start_date: startDate.toISOString().split('T')[0],
          end_date: input.date,
        }),
        getWorkoutSessionsByDateRange(ctx.db, {
          tenant_id: ctx.tenantId,
          user_id: ctx.userId,
          start_date: chronicStartDate.toISOString().split('T')[0],
          end_date: input.date,
        }),
      ]);

      const wellnessData: WellnessMetric[] = wellnessHistory.map(w => ({
        id: w.id,
        date: w.date,
        rhr: w.rhr,
        hrv_rmssd: w.hrv_rmssd,
        hrv_ratio: w.hrv_ratio,
      }));

      const acwrHistory: ACWRHistoryPoint[] = wellnessHistory.map(w => {
        const acute_load = calculateAcuteLoad(allSessions, w.date);
        const chronic_load = calculateChronicLoad(allSessions, w.date);
        const ratio = chronic_load === 0 ? 0 : acute_load / chronic_load;
        return {
          date: w.date,
          acute_load,
          chronic_load,
          ratio,
          isDanger: ratio > 1.5,
        };
      });

      const currentAcwr = acwrHistory.length > 0 
        ? acwrHistory[acwrHistory.length - 1]
        : { acute_load: 0, chronic_load: 0, ratio: 0, isDanger: false };

      const acwrData: ACWRData = {
        acute_load: currentAcwr.acute_load,
        chronic_load: currentAcwr.chronic_load,
        ratio: currentAcwr.ratio,
        isDanger: currentAcwr.isDanger,
      };

      return {
        acwr: acwrData,
        acwrHistory,
        wellnessHistory: wellnessData,
      };
    }),
});
