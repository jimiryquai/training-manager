import { z } from 'zod';
import { router } from '../trpc';
import { protectedProcedure } from '../trpc';
import {
  createExercise,
  getExercisesByCategory,
  getExerciseWithMaster,
  upsertUserBenchmark,
} from '../../services/exerciseDictionary.service';
import type { MovementCategory } from '../../db/schema';

const movementCategorySchema = z.enum(['squat', 'hinge', 'push', 'pull', 'carry', 'core', 'cardio']);

const addExerciseSchema = z.object({
  name: z.string().min(1),
  movement_category: movementCategorySchema,
  progression_level: z.number().int().min(1),
  master_exercise_id: z.string().optional(),
  conversion_factor: z.number().positive().optional(),
});

const getExercisesByCategorySchema = z.object({
  movement_category: movementCategorySchema,
});

const getExerciseWithMasterSchema = z.object({
  id: z.string(),
});

const saveUserBenchmarkSchema = z.object({
  master_exercise_name: z.string().min(1),
  one_rep_max_weight: z.number().positive(),
});

export const libraryRouter = router({
  addExercise: protectedProcedure
    .input(addExerciseSchema)
    .mutation(async ({ ctx, input }) => {
      return createExercise(ctx.db, {
        tenant_id: ctx.tenantId,
        name: input.name,
        movement_category: input.movement_category as MovementCategory,
        progression_level: input.progression_level,
        master_exercise_id: input.master_exercise_id,
        conversion_factor: input.conversion_factor,
      });
    }),

  getExercisesByCategory: protectedProcedure
    .input(getExercisesByCategorySchema)
    .query(async ({ ctx, input }) => {
      return getExercisesByCategory(ctx.db, {
        tenant_id: ctx.tenantId,
        movement_category: input.movement_category as MovementCategory,
      });
    }),

  getExerciseWithMaster: protectedProcedure
    .input(getExerciseWithMasterSchema)
    .query(async ({ ctx, input }) => {
      return getExerciseWithMaster(ctx.db, {
        tenant_id: ctx.tenantId,
        id: input.id,
      });
    }),

  saveUserBenchmark: protectedProcedure
    .input(saveUserBenchmarkSchema)
    .mutation(async ({ ctx, input }) => {
      return upsertUserBenchmark(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        master_exercise_name: input.master_exercise_name,
        one_rep_max_weight: input.one_rep_max_weight,
      });
    }),
});
