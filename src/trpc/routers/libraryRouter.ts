import { z } from 'zod';
import { router } from '../trpc';
import { protectedProcedure } from '../trpc';
import {
  createExercise,
  getExercisesByCategory,
  getExercisesByBenchmarkTarget,
  getExercisesForTenant,
  getSystemExercises,
  updateExercise,
  deleteExercise,
  upsertUserBenchmark,
  getUserBenchmark,
  getUserBenchmarks,
  getTrainingMaxForExercise,
} from '../../services/exerciseDictionary.service';
import type { MovementCategory, ExerciseType, BenchmarkUnit } from '../../db/schema';

// Updated movement category schema with all 19+ categories
const movementCategorySchema = z.enum([
  'squat',
  'hinge',
  'push',
  'pull',
  'carry',
  'core',
  'cardio',
  'horizontal_push',
  'horizontal_pull',
  'vertical_push',
  'vertical_pull',
  'unilateral_leg',
  'bilateral_leg',
  'core_flexion',
  'core_rotation',
  'core_antiextension',
  'core_antilateral',
  'conditioning',
  'mobility',
  'warmup',
  'cooldown',
]);

const exerciseTypeSchema = z.enum(['dynamic', 'isometric', 'eccentric']);
const benchmarkUnitSchema = z.enum(['kg', 'lbs', 'seconds', 'reps', 'meters']);

const addExerciseSchema = z.object({
  name: z.string().min(1),
  movement_category: movementCategorySchema,
  exercise_type: exerciseTypeSchema,
  benchmark_target: z.string().optional(),
  conversion_factor: z.number().positive().optional(),
  is_system_template: z.boolean().optional(), // Admin only - for creating global exercises
});

const getExercisesByCategorySchema = z.object({
  movement_category: movementCategorySchema,
});

const getExercisesByBenchmarkSchema = z.object({
  benchmark_target: z.string(),
});

const updateExerciseSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  movement_category: movementCategorySchema.optional(),
  exercise_type: exerciseTypeSchema.optional(),
  benchmark_target: z.string().nullable().optional(),
  conversion_factor: z.number().positive().nullable().optional(),
});

const deleteExerciseSchema = z.object({
  id: z.string(),
});

const saveUserBenchmarkSchema = z.object({
  benchmark_name: z.string().min(1),
  benchmark_value: z.number().optional(),
  benchmark_unit: benchmarkUnitSchema.optional(),
  training_max_percentage: z.number().min(0).max(100).optional(),
});

const getUserBenchmarkSchema = z.object({
  benchmark_name: z.string(),
});

const getTrainingMaxSchema = z.object({
  exercise_id: z.string(),
});

export const libraryRouter = router({
  // Exercise Dictionary CRUD
  addExercise: protectedProcedure
    .input(addExerciseSchema)
    .mutation(async ({ ctx, input }) => {
      // Only admin users can create system templates
      const tenantId = input.is_system_template ? null : ctx.tenantId;
      
      return createExercise(ctx.db, {
        tenant_id: tenantId,
        name: input.name,
        movement_category: input.movement_category as MovementCategory,
        exercise_type: input.exercise_type as ExerciseType,
        benchmark_target: input.benchmark_target,
        conversion_factor: input.conversion_factor,
      });
    }),

  updateExercise: protectedProcedure
    .input(updateExerciseSchema)
    .mutation(async ({ ctx, input }) => {
      return updateExercise(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
        name: input.name,
        movement_category: input.movement_category as MovementCategory | undefined,
        exercise_type: input.exercise_type as ExerciseType | undefined,
        benchmark_target: input.benchmark_target,
        conversion_factor: input.conversion_factor,
      });
    }),

  deleteExercise: protectedProcedure
    .input(deleteExerciseSchema)
    .mutation(async ({ ctx, input }) => {
      return deleteExercise(ctx.db, {
        id: input.id,
        tenant_id: ctx.tenantId,
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

  getExercisesByBenchmark: protectedProcedure
    .input(getExercisesByBenchmarkSchema)
    .query(async ({ ctx, input }) => {
      return getExercisesByBenchmarkTarget(ctx.db, {
        benchmark_target: input.benchmark_target,
        tenant_id: ctx.tenantId,
      });
    }),

  // Get all exercises accessible to tenant (global + tenant-specific)
  getExercises: protectedProcedure.query(async ({ ctx }) => {
    return getExercisesForTenant(ctx.db, ctx.tenantId);
  }),

  // Get only global system exercises
  getSystemExercises: protectedProcedure.query(async ({ ctx }) => {
    return getSystemExercises(ctx.db);
  }),

  // User Benchmark CRUD
  saveUserBenchmark: protectedProcedure
    .input(saveUserBenchmarkSchema)
    .mutation(async ({ ctx, input }) => {
      return upsertUserBenchmark(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        benchmark_name: input.benchmark_name,
        benchmark_value: input.benchmark_value,
        benchmark_unit: input.benchmark_unit as BenchmarkUnit | undefined,
        training_max_percentage: input.training_max_percentage,
      });
    }),

  getUserBenchmark: protectedProcedure
    .input(getUserBenchmarkSchema)
    .query(async ({ ctx, input }) => {
      return getUserBenchmark(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        benchmark_name: input.benchmark_name,
      });
    }),

  getUserBenchmarks: protectedProcedure.query(async ({ ctx }) => {
    return getUserBenchmarks(ctx.db, {
      tenant_id: ctx.tenantId,
      user_id: ctx.userId,
    });
  }),

  // Get the training max for an exercise (with conversion factor applied)
  getTrainingMaxForExercise: protectedProcedure
    .input(getTrainingMaxSchema)
    .query(async ({ ctx, input }) => {
      return getTrainingMaxForExercise(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        exercise_id: input.exercise_id,
      });
    }),
});
