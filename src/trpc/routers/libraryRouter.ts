import { z } from 'zod';
import { router } from '../trpc';
import { protectedProcedure } from '../trpc';
import {
  createExercise,
  getExercisesByCategory,
  getExerciseWithMaster,
  upsertUserBenchmark,
} from '../../services/exerciseDictionary.service';
import type { MovementCategory, ExerciseType, BenchmarkUnit } from '../../db/schema';

const movementCategorySchema = z.enum(['squat', 'hinge', 'push', 'pull', 'carry', 'core', 'cardio']);
const exerciseTypeSchema = z.enum(['dynamic', 'isometric', 'eccentric']);
const benchmarkUnitSchema = z.enum(['kg', 'lbs', 'seconds']);

const addExerciseSchema = z.object({
  name: z.string().min(1),
  movement_category: movementCategorySchema,
  progression_level: z.number().int().min(1),
  exercise_type: exerciseTypeSchema,
  benchmark_target: z.string().optional(),
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
  benchmark_name: z.string().min(1),
  benchmark_value: z.number().optional(),
  benchmark_unit: benchmarkUnitSchema.optional(),
  master_exercise_id: z.string().optional(),
  one_rep_max_weight: z.number().positive().optional(),
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
        exercise_type: input.exercise_type as ExerciseType,
        benchmark_target: input.benchmark_target,
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
        benchmark_name: input.benchmark_name,
        benchmark_value: input.benchmark_value,
        benchmark_unit: input.benchmark_unit as BenchmarkUnit | undefined,
        master_exercise_id: input.master_exercise_id,
        one_rep_max_weight: input.one_rep_max_weight,
      });
    }),

  getExercises: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db
        .selectFrom('exercise_dictionary')
        .where('tenant_id', '=', ctx.tenantId)
        .selectAll()
        .orderBy('movement_category')
        .orderBy('progression_level')
        .execute();
    }),
});
