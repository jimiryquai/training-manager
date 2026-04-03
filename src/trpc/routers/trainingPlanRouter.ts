import { z } from 'zod';
import { router } from '../trpc';
import { protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  createTrainingPlan,
  getTrainingPlanById,
  getSystemTrainingPlans,
  getTrainingPlansForTenant,
  updateTrainingPlan,
  deleteTrainingPlan,
  cloneTrainingPlanToTenant,
  getFullTrainingPlan,
} from '../../services/trainingPlan.service';

// ============================================================================
// Training Plan Schemas
// ============================================================================

const createTrainingPlanSchema = z.object({
  name: z.string().min(1),
  is_system_template: z.boolean().optional(),
});

const getTrainingPlanSchema = z.object({
  id: z.string(),
});

const updateTrainingPlanSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
});

const deleteTrainingPlanSchema = z.object({
  id: z.string(),
});

const cloneTrainingPlanSchema = z.object({
  plan_id: z.string(),
  new_name: z.string().optional(),
});

const getFullTrainingPlanSchema = z.object({
  id: z.string(),
});

export const trainingPlanRouter = router({
  // ============================================================================
  // Training Plan CRUD
  // ============================================================================

  createPlan: protectedProcedure
    .input(createTrainingPlanSchema)
    .mutation(async ({ ctx, input }) => {
      // Only admin users can create system templates
      if (input.is_system_template && ctx.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can create system templates',
        });
      }

      // System templates have null tenant_id, regular plans use ctx.tenantId
      const tenantId = input.is_system_template ? null : ctx.tenantId;

      return createTrainingPlan(ctx.db, {
        tenant_id: tenantId,
        name: input.name,
        is_system_template: input.is_system_template ? 1 : 0,
      });
    }),

  getPlan: protectedProcedure
    .input(getTrainingPlanSchema)
    .query(async ({ ctx, input }) => {
      return getTrainingPlanById(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
      });
    }),

  getSystemPlans: protectedProcedure.query(async ({ ctx }) => {
    return getSystemTrainingPlans(ctx.db);
  }),

  getPlansForTenant: protectedProcedure.query(async ({ ctx }) => {
    return getTrainingPlansForTenant(ctx.db, ctx.tenantId);
  }),

  updatePlan: protectedProcedure
    .input(updateTrainingPlanSchema)
    .mutation(async ({ ctx, input }) => {
      return updateTrainingPlan(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
        name: input.name,
      });
    }),

  deletePlan: protectedProcedure
    .input(deleteTrainingPlanSchema)
    .mutation(async ({ ctx, input }) => {
      return deleteTrainingPlan(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
      });
    }),

  clonePlan: protectedProcedure
    .input(cloneTrainingPlanSchema)
    .mutation(async ({ ctx, input }) => {
      return cloneTrainingPlanToTenant(ctx.db, {
        plan_id: input.plan_id,
        tenant_id: ctx.tenantId,
        new_name: input.new_name,
      });
    }),

  getFullPlan: protectedProcedure
    .input(getFullTrainingPlanSchema)
    .query(async ({ ctx, input }) => {
      return getFullTrainingPlan(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
      });
    }),
});
