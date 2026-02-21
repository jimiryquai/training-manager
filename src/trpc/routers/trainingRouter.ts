import { z } from 'zod';
import { router } from '../trpc';
import { protectedProcedure } from '../trpc';
import { createWorkoutSession } from '../../services/workoutSession.service';
import { calculateACWR } from '../../services/acwr.service';
import type { Modality } from '../../db/schema';

const logSessionSchema = z.object({
  date: z.string(),
  modality: z.enum(['strength', 'rowing', 'running', 'cycling', 'swimming', 'other']),
  duration_minutes: z.number().int().positive(),
  srpe: z.number().int().min(1).max(10),
});

const getACWRStatusSchema = z.object({
  date: z.string(),
});

export const trainingRouter = router({
  logSession: protectedProcedure
    .input(logSessionSchema)
    .mutation(async ({ ctx, input }) => {
      return createWorkoutSession(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        date: input.date,
        modality: input.modality as Modality,
        duration_minutes: input.duration_minutes,
        srpe: input.srpe,
      });
    }),

  getACWRStatus: protectedProcedure
    .input(getACWRStatusSchema)
    .query(async ({ ctx, input }) => {
      return calculateACWR(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        date: input.date,
      });
    }),
});
