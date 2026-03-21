import { z } from 'zod';
import { router } from '../trpc';
import { protectedProcedure } from '../trpc';
import {
  createWorkoutSession,
  updateWorkoutSession,
  getWorkoutSessionById,
  getWorkoutSessionsByDateRange,
  createWorkoutSessionViaAgent,
  markWorkoutAsVoiceEntry,
} from '../../services/workoutSession.service';
import { calculateACWR } from '../../services/acwr.service';

const logSessionSchema = z.object({
  date: z.string(),
  planned_session_id: z.string().optional(),
  duration_minutes: z.number().int().positive(),
  srpe: z.number().int().min(1).max(10),
  completed_as_planned: z.boolean().optional(),
});

const updateSessionSchema = z.object({
  id: z.string(),
  duration_minutes: z.number().int().positive().optional(),
  srpe: z.number().int().min(1).max(10).optional(),
  completed_as_planned: z.boolean().optional(),
});

const getSessionSchema = z.object({
  id: z.string(),
});

const getSessionsByDateRangeSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
});

const getACWRStatusSchema = z.object({
  date: z.string(),
});

// Schema for AI Agent voice entry
const logSessionViaAgentSchema = z.object({
  date: z.string(),
  planned_session_id: z.string().optional(),
  duration_minutes: z.number().int().positive(),
  srpe: z.number().int().min(1).max(10),
  completed_as_planned: z.boolean().optional(),
  agent_reasoning: z.string(),
});

const markAsVoiceEntrySchema = z.object({
  id: z.string(),
  agent_reasoning: z.string(),
  modifications: z.record(z.string(), z.unknown()),
});

export const trainingRouter = router({
  logSession: protectedProcedure
    .input(logSessionSchema)
    .mutation(async ({ ctx, input }) => {
      return createWorkoutSession(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        date: input.date,
        planned_session_id: input.planned_session_id,
        duration_minutes: input.duration_minutes,
        srpe: input.srpe,
        completed_as_planned: input.completed_as_planned ? 1 : 0,
      });
    }),

  updateSession: protectedProcedure
    .input(updateSessionSchema)
    .mutation(async ({ ctx, input }) => {
      return updateWorkoutSession(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
        duration_minutes: input.duration_minutes,
        srpe: input.srpe,
        completed_as_planned: input.completed_as_planned ? 1 : 0,
      });
    }),

  getSession: protectedProcedure
    .input(getSessionSchema)
    .query(async ({ ctx, input }) => {
      return getWorkoutSessionById(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
      });
    }),

  getSessionsByDateRange: protectedProcedure
    .input(getSessionsByDateRangeSchema)
    .query(async ({ ctx, input }) => {
      return getWorkoutSessionsByDateRange(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        start_date: input.start_date,
        end_date: input.end_date,
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

  // AI Agent procedures for voice-to-DB pipeline
  logSessionViaAgent: protectedProcedure
    .input(logSessionViaAgentSchema)
    .mutation(async ({ ctx, input }) => {
      return createWorkoutSessionViaAgent(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        date: input.date,
        planned_session_id: input.planned_session_id,
        duration_minutes: input.duration_minutes,
        srpe: input.srpe,
        completed_as_planned: input.completed_as_planned ? 1 : 0,
        agent_reasoning: input.agent_reasoning,
      });
    }),

  markAsVoiceEntry: protectedProcedure
    .input(markAsVoiceEntrySchema)
    .mutation(async ({ ctx, input }) => {
      return markWorkoutAsVoiceEntry(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
        agent_reasoning: input.agent_reasoning,
        modifications: input.modifications,
      });
    }),
});
