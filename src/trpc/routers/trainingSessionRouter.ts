import { z } from 'zod';
import { router } from '../trpc';
import { protectedProcedure } from '../trpc';
import {
  createTrainingSession,
  getTrainingSessionById,
  getTrainingSessionsByPlan,
  getTrainingSessionsByWeek,
  updateTrainingSession,
  deleteTrainingSession,
  getFullTrainingSession,
} from '../../services/trainingSession.service';
import {
  createSessionExercise,
  getSessionExerciseById,
  getSessionExercisesBySession,
  getSessionExercisesGrouped,
  updateSessionExercise,
  deleteSessionExercise,
} from '../../services/sessionExercise.service';

// ============================================================================
// Training Session Schemas
// ============================================================================

const createTrainingSessionSchema = z.object({
  plan_id: z.string(),
  block_name: z.string().optional(),
  week_number: z.number().int().min(1).optional(),
  day_of_week: z.string().optional(),
  session_name: z.string().optional(),
});

const getTrainingSessionSchema = z.object({
  id: z.string(),
});

const getTrainingSessionsByPlanSchema = z.object({
  plan_id: z.string(),
});

const getTrainingSessionsByWeekSchema = z.object({
  plan_id: z.string(),
  week_number: z.number().int().min(1),
});

const updateTrainingSessionSchema = z.object({
  id: z.string(),
  block_name: z.string().nullable().optional(),
  week_number: z.number().int().min(1).nullable().optional(),
  day_of_week: z.string().nullable().optional(),
  session_name: z.string().nullable().optional(),
});

const deleteTrainingSessionSchema = z.object({
  id: z.string(),
});

const getFullTrainingSessionSchema = z.object({
  id: z.string(),
});

// ============================================================================
// Session Exercise Schemas
// ============================================================================

const createSessionExerciseSchema = z.object({
  session_id: z.string(),
  exercise_dictionary_id: z.string(),
  circuit_group: z.string().optional(),
  order_in_session: z.number().int().min(1),
  scheme_name: z.string().optional(),
  coach_notes: z.string().optional(),
});

const getSessionExerciseSchema = z.object({
  id: z.string(),
});

const getSessionExercisesBySessionSchema = z.object({
  session_id: z.string(),
});

const updateSessionExerciseSchema = z.object({
  id: z.string(),
  circuit_group: z.string().nullable().optional(),
  order_in_session: z.number().int().min(1).optional(),
  scheme_name: z.string().nullable().optional(),
  coach_notes: z.string().nullable().optional(),
});

const deleteSessionExerciseSchema = z.object({
  id: z.string(),
});

export const trainingSessionRouter = router({
  // ============================================================================
  // Training Session CRUD
  // ============================================================================

  createSession: protectedProcedure
    .input(createTrainingSessionSchema)
    .mutation(async ({ ctx, input }) => {
      return createTrainingSession(ctx.db, {
        tenant_id: ctx.tenantId,
        plan_id: input.plan_id,
        block_name: input.block_name,
        week_number: input.week_number,
        day_of_week: input.day_of_week,
        session_name: input.session_name,
      });
    }),

  getSession: protectedProcedure
    .input(getTrainingSessionSchema)
    .query(async ({ ctx, input }) => {
      return getTrainingSessionById(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
      });
    }),

  getSessionsByPlan: protectedProcedure
    .input(getTrainingSessionsByPlanSchema)
    .query(async ({ ctx, input }) => {
      return getTrainingSessionsByPlan(ctx.db, {
        plan_id: input.plan_id,
        tenant_id: ctx.tenantId,
      });
    }),

  getSessionsByWeek: protectedProcedure
    .input(getTrainingSessionsByWeekSchema)
    .query(async ({ ctx, input }) => {
      return getTrainingSessionsByWeek(ctx.db, {
        plan_id: input.plan_id,
        week_number: input.week_number,
        tenant_id: ctx.tenantId,
      });
    }),

  updateSession: protectedProcedure
    .input(updateTrainingSessionSchema)
    .mutation(async ({ ctx, input }) => {
      return updateTrainingSession(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
        block_name: input.block_name,
        week_number: input.week_number,
        day_of_week: input.day_of_week,
        session_name: input.session_name,
      });
    }),

  deleteSession: protectedProcedure
    .input(deleteTrainingSessionSchema)
    .mutation(async ({ ctx, input }) => {
      return deleteTrainingSession(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
      });
    }),

  getFullSession: protectedProcedure
    .input(getFullTrainingSessionSchema)
    .query(async ({ ctx, input }) => {
      return getFullTrainingSession(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
      });
    }),

  // ============================================================================
  // Session Exercise CRUD
  // ============================================================================

  createExercise: protectedProcedure
    .input(createSessionExerciseSchema)
    .mutation(async ({ ctx, input }) => {
      return createSessionExercise(ctx.db, {
        tenant_id: ctx.tenantId,
        session_id: input.session_id,
        exercise_dictionary_id: input.exercise_dictionary_id,
        circuit_group: input.circuit_group,
        order_in_session: input.order_in_session,
        scheme_name: input.scheme_name,
        coach_notes: input.coach_notes,
      });
    }),

  getExercise: protectedProcedure
    .input(getSessionExerciseSchema)
    .query(async ({ ctx, input }) => {
      return getSessionExerciseById(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
      });
    }),

  getExercisesBySession: protectedProcedure
    .input(getSessionExercisesBySessionSchema)
    .query(async ({ ctx, input }) => {
      return getSessionExercisesBySession(ctx.db, {
        session_id: input.session_id,
        tenant_id: ctx.tenantId,
      });
    }),

  getExercisesGrouped: protectedProcedure
    .input(getSessionExercisesBySessionSchema)
    .query(async ({ ctx, input }) => {
      const grouped = await getSessionExercisesGrouped(ctx.db, { session_id: input.session_id, tenant_id: ctx.tenantId });
      // Convert Map to object for serialization
      const result: Record<string, typeof grouped extends Map<infer K, infer V> ? V : never> = {};
      for (const [key, value] of grouped) {
        result[key ?? 'ungrouped'] = value;
      }
      return result;
    }),

  updateExercise: protectedProcedure
    .input(updateSessionExerciseSchema)
    .mutation(async ({ ctx, input }) => {
      return updateSessionExercise(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
        circuit_group: input.circuit_group,
        order_in_session: input.order_in_session,
        scheme_name: input.scheme_name,
        coach_notes: input.coach_notes,
      });
    }),

  deleteExercise: protectedProcedure
    .input(deleteSessionExerciseSchema)
    .mutation(async ({ ctx, input }) => {
      return deleteSessionExercise(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
      });
    }),
});
