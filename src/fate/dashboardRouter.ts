import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc';
import { createResolver } from '@nkzw/fate/server';
import { calculateACWR } from '../services/acwr.service';
import { getDailyWellnessByDateRange } from '../services/dailyWellness.service';
import { ReadinessView, type ACWRData, type WellnessMetric } from './views';

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

      const [acwrResult, wellnessHistory] = await Promise.all([
        calculateACWR(ctx.db, {
          tenant_id: ctx.tenantId,
          user_id: ctx.userId,
          date: input.date,
        }),
        getDailyWellnessByDateRange(ctx.db, {
          tenant_id: ctx.tenantId,
          user_id: ctx.userId,
          start_date: startDate.toISOString().split('T')[0],
          end_date: input.date,
        }),
      ]);

      const select = input.select ?? ['acwr', 'wellnessHistory'];

      const { resolve } = createResolver({
        ctx,
        select,
        view: ReadinessView,
      });

      const acwrData: ACWRData = {
        acute_load: acwrResult.acute_load,
        chronic_load: acwrResult.chronic_load,
        ratio: acwrResult.ratio,
        isDanger: acwrResult.isDanger,
      };

      const wellnessData: WellnessMetric[] = wellnessHistory.map(w => ({
        id: w.id,
        date: w.date,
        rhr: w.rhr,
        hrv_rmssd: w.hrv_rmssd,
        hrv_ratio: w.hrv_ratio,
      }));

      return resolve({
        acwr: acwrData,
        wellnessHistory: wellnessData,
      });
    }),
});
