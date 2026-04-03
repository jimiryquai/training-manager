import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TENANT_A = 'tenant-exercise-a';
const TENANT_B = 'tenant-exercise-b';
const USER_A = 'user-exercise-a';
const USER_B = 'user-exercise-b';

describe('Exercise Dictionary Service - Integration Tests', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TENANT_A);
    await vitestInvoke('test_cleanDatabase', TENANT_B);
    // Create test users in both tenants (required for FK constraints on user_benchmarks)
    await vitestInvoke('test_createUser', {
      id: USER_A,
      email: 'exercise-a@test.com',
      tenant_id: TENANT_A,
    });
    await vitestInvoke('test_createUser', {
      id: USER_B,
      email: 'exercise-b@test.com',
      tenant_id: TENANT_B,
    });
  });

  // ===========================================================================
  // Exercise CRUD
  // ===========================================================================

  describe('createExercise', () => {
    it('should create exercise with all fields', async () => {
      const result = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Back Squat',
        movement_category: 'knee_dominant',
        exercise_type: 'dynamic',
        benchmark_target: 'squat',
        conversion_factor: 1.0,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.tenant_id).toBe(TENANT_A);
      expect(result.name).toBe('Back Squat');
      expect(result.movement_category).toBe('knee_dominant');
      expect(result.exercise_type).toBe('dynamic');
      expect(result.benchmark_target).toBe('squat');
      expect(result.conversion_factor).toBe(1.0);
    });

    it('should create system exercise (tenant_id = null)', async () => {
      const result = await vitestInvoke<any>('test_createExercise', {
        tenant_id: null,
        name: 'Bench Press',
        movement_category: 'horizontal_push',
        exercise_type: 'dynamic',
      });

      expect(result).toBeDefined();
      expect(result.tenant_id).toBeNull();
      expect(result.name).toBe('Bench Press');
    });

    it('should create tenant-specific exercise', async () => {
      const result = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Custom Movement',
        movement_category: 'core',
        exercise_type: 'isometric',
      });

      expect(result).toBeDefined();
      expect(result.tenant_id).toBe(TENANT_A);
    });

    it('should default benchmark_target and conversion_factor to null', async () => {
      const result = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Plank',
        movement_category: 'core',
        exercise_type: 'isometric',
      });

      expect(result).toBeDefined();
      expect(result.benchmark_target).toBeNull();
      expect(result.conversion_factor).toBeNull();
    });
  });

  describe('getExerciseById', () => {
    it('should find exercise by id', async () => {
      const created = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Deadlift',
        movement_category: 'hip_hinge',
        exercise_type: 'dynamic',
      });

      const result = await vitestInvoke<any>('test_getExerciseById', {
        id: created.id,
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Deadlift');
    });

    it('should return undefined for non-existent id', async () => {
      const result = await vitestInvoke<any>('test_getExerciseById', {
        id: 'non-existent-uuid',
      });

      expect(result).toBeUndefined();
    });

    it('should filter by tenant_id when provided', async () => {
      const created = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Pull-up',
        movement_category: 'vertical_pull',
        exercise_type: 'dynamic',
      });

      // Should find with matching tenant
      const found = await vitestInvoke<any>('test_getExerciseById', {
        id: created.id,
        tenant_id: TENANT_A,
      });
      expect(found).toBeDefined();

      // Should NOT find with different tenant
      const notFound = await vitestInvoke<any>('test_getExerciseById', {
        id: created.id,
        tenant_id: TENANT_B,
      });
      expect(notFound).toBeUndefined();
    });
  });

  describe('getExercisesByCategory', () => {
    it('should return exercises matching category', async () => {
      await vitestInvoke('test_createExercise', {
        tenant_id: null,
        name: 'Back Squat',
        movement_category: 'knee_dominant',
        exercise_type: 'dynamic',
      });
      await vitestInvoke('test_createExercise', {
        tenant_id: null,
        name: 'Front Squat',
        movement_category: 'knee_dominant',
        exercise_type: 'dynamic',
      });

      const results = await vitestInvoke<any[]>('test_getExercisesByCategory', {
        tenant_id: null,
        movement_category: 'knee_dominant',
      });

      expect(results).toHaveLength(2);
      expect(results.map((r: any) => r.name)).toContain('Back Squat');
      expect(results.map((r: any) => r.name)).toContain('Front Squat');
    });

    it('should return empty for non-existent category', async () => {
      const results = await vitestInvoke<any[]>('test_getExercisesByCategory', {
        tenant_id: null,
        movement_category: 'nonexistent_category',
      });

      expect(results).toHaveLength(0);
    });

    it('should respect tenant_id filter (null for global)', async () => {
      await vitestInvoke('test_createExercise', {
        tenant_id: null,
        name: 'Global Squat',
        movement_category: 'knee_dominant',
        exercise_type: 'dynamic',
      });
      await vitestInvoke('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Tenant Squat',
        movement_category: 'knee_dominant',
        exercise_type: 'dynamic',
      });

      const globalResults = await vitestInvoke<any[]>('test_getExercisesByCategory', {
        tenant_id: null,
        movement_category: 'knee_dominant',
      });
      expect(globalResults).toHaveLength(1);
      expect(globalResults[0].name).toBe('Global Squat');
    });
  });

  describe('getExercisesByBenchmarkTarget', () => {
    it('should find exercises targeting a benchmark', async () => {
      await vitestInvoke('test_createExercise', {
        tenant_id: null,
        name: 'Bench Press',
        movement_category: 'horizontal_push',
        exercise_type: 'dynamic',
        benchmark_target: 'bench_press',
      });

      const results = await vitestInvoke<any[]>('test_getExercisesByBenchmarkTarget', {
        benchmark_target: 'bench_press',
      });

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r: any) => r.name === 'Bench Press')).toBe(true);
    });

    it('should filter by tenant_id when provided', async () => {
      await vitestInvoke('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Incline Press',
        movement_category: 'horizontal_push',
        exercise_type: 'dynamic',
        benchmark_target: 'bench_press',
      });

      const results = await vitestInvoke<any[]>('test_getExercisesByBenchmarkTarget', {
        benchmark_target: 'bench_press',
        tenant_id: TENANT_A,
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Incline Press');
    });
  });

  describe('getSystemExercises', () => {
    it('should return only global (tenant_id = null) exercises', async () => {
      await vitestInvoke('test_createExercise', {
        tenant_id: null,
        name: 'Global Deadlift',
        movement_category: 'hip_hinge',
        exercise_type: 'dynamic',
      });
      await vitestInvoke('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Tenant Deadlift',
        movement_category: 'hip_hinge',
        exercise_type: 'dynamic',
      });

      const results = await vitestInvoke<any[]>('test_getSystemExercises');

      expect(results.every((r: any) => r.tenant_id === null)).toBe(true);
      expect(results.some((r: any) => r.name === 'Global Deadlift')).toBe(true);
    });

    it('should not include tenant-specific exercises', async () => {
      await vitestInvoke('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Private Movement',
        movement_category: 'core',
        exercise_type: 'isometric',
      });

      const results = await vitestInvoke<any[]>('test_getSystemExercises');

      expect(results.some((r: any) => r.name === 'Private Movement')).toBe(false);
    });
  });

  describe('getExercisesForTenant', () => {
    it('should return global + tenant-specific exercises', async () => {
      await vitestInvoke('test_createExercise', {
        tenant_id: null,
        name: 'Global Exercise',
        movement_category: 'core',
        exercise_type: 'dynamic',
      });
      await vitestInvoke('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Tenant A Exercise',
        movement_category: 'core',
        exercise_type: 'dynamic',
      });

      const results = await vitestInvoke<any[]>('test_getExercisesForTenant', TENANT_A);

      expect(results.some((r: any) => r.name === 'Global Exercise')).toBe(true);
      expect(results.some((r: any) => r.name === 'Tenant A Exercise')).toBe(true);
    });

    it('should not return exercises from other tenants', async () => {
      await vitestInvoke('test_createExercise', {
        tenant_id: TENANT_B,
        name: 'Tenant B Exercise',
        movement_category: 'core',
        exercise_type: 'dynamic',
      });

      const results = await vitestInvoke<any[]>('test_getExercisesForTenant', TENANT_A);

      expect(results.some((r: any) => r.name === 'Tenant B Exercise')).toBe(false);
    });
  });

  describe('updateExercise', () => {
    it('should update name', async () => {
      const created = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Squat',
        movement_category: 'knee_dominant',
        exercise_type: 'dynamic',
      });

      const updated = await vitestInvoke<any>('test_updateExercise', {
        id: created.id,
        tenant_id: TENANT_A,
        name: 'Back Squat',
      });

      expect(updated).toBeDefined();
      expect(updated.name).toBe('Back Squat');
    });

    it('should update exercise_type', async () => {
      const created = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Pause Squat',
        movement_category: 'knee_dominant',
        exercise_type: 'dynamic',
      });

      const updated = await vitestInvoke<any>('test_updateExercise', {
        id: created.id,
        tenant_id: TENANT_A,
        exercise_type: 'isometric',
      });

      expect(updated).toBeDefined();
      expect(updated.exercise_type).toBe('isometric');
    });

    it('should update benchmark_target', async () => {
      const created = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Close Grip Bench',
        movement_category: 'horizontal_push',
        exercise_type: 'dynamic',
      });

      const updated = await vitestInvoke<any>('test_updateExercise', {
        id: created.id,
        tenant_id: TENANT_A,
        benchmark_target: 'bench_press',
      });

      expect(updated).toBeDefined();
      expect(updated.benchmark_target).toBe('bench_press');
    });

    it('should update conversion_factor', async () => {
      const created = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Close Grip Bench',
        movement_category: 'horizontal_push',
        exercise_type: 'dynamic',
        benchmark_target: 'bench_press',
      });

      const updated = await vitestInvoke<any>('test_updateExercise', {
        id: created.id,
        tenant_id: TENANT_A,
        conversion_factor: 0.9,
      });

      expect(updated).toBeDefined();
      expect(updated.conversion_factor).toBe(0.9);
    });

    it('should not update exercise from different tenant', async () => {
      const created = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Squat',
        movement_category: 'knee_dominant',
        exercise_type: 'dynamic',
      });

      const result = await vitestInvoke<any>('test_updateExercise', {
        id: created.id,
        tenant_id: TENANT_B,
        name: 'Hacked Squat',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('deleteExercise', () => {
    it('should delete exercise and return true', async () => {
      const created = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'ToDelete',
        movement_category: 'core',
        exercise_type: 'dynamic',
      });

      const deleted = await vitestInvoke<boolean>('test_deleteExercise', {
        id: created.id,
        tenant_id: TENANT_A,
      });

      expect(deleted).toBe(true);

      // Verify it's gone
      const found = await vitestInvoke('test_getExerciseById', { id: created.id });
      expect(found).toBeUndefined();
    });

    it('should return false for non-existent exercise', async () => {
      const deleted = await vitestInvoke<boolean>('test_deleteExercise', {
        id: 'non-existent-uuid',
        tenant_id: TENANT_A,
      });

      expect(deleted).toBe(false);
    });

    it('should not delete exercise from different tenant', async () => {
      const created = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Protected',
        movement_category: 'core',
        exercise_type: 'dynamic',
      });

      const deleted = await vitestInvoke<boolean>('test_deleteExercise', {
        id: created.id,
        tenant_id: TENANT_B,
      });

      expect(deleted).toBe(false);
    });
  });

  // ===========================================================================
  // User Benchmark CRUD
  // ===========================================================================

  describe('createUserBenchmark', () => {
    it('should create benchmark with all fields', async () => {
      const result = await vitestInvoke<any>('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'squat',
        benchmark_value: 140,
        benchmark_unit: 'kg',
        training_max_percentage: 90,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.tenant_id).toBe(TENANT_A);
      expect(result.user_id).toBe(USER_A);
      expect(result.benchmark_name).toBe('squat');
      expect(result.benchmark_value).toBe(140);
      expect(result.benchmark_unit).toBe('kg');
      expect(result.training_max_percentage).toBe(90);
    });

    it('should default training_max_percentage to 100', async () => {
      const result = await vitestInvoke<any>('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'deadlift',
        benchmark_value: 180,
        benchmark_unit: 'kg',
      });

      expect(result).toBeDefined();
      expect(result.training_max_percentage).toBe(100);
    });
  });

  describe('upsertUserBenchmark', () => {
    it('should create new benchmark if not exists', async () => {
      const result = await vitestInvoke<any>('test_upsertUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'bench_press',
        benchmark_value: 100,
        benchmark_unit: 'kg',
      });

      expect(result).toBeDefined();
      expect(result.benchmark_name).toBe('bench_press');
      expect(result.benchmark_value).toBe(100);
    });

    it('should update existing benchmark by name', async () => {
      await vitestInvoke('test_upsertUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'bench_press',
        benchmark_value: 100,
        benchmark_unit: 'kg',
      });

      const updated = await vitestInvoke<any>('test_upsertUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'bench_press',
        benchmark_value: 110,
        benchmark_unit: 'kg',
      });

      expect(updated).toBeDefined();
      expect(updated.benchmark_value).toBe(110);
    });

    it('should preserve training_max_percentage on update when not provided', async () => {
      // Use service-level createUserBenchmark which properly sets training_max_percentage
      await vitestInvoke('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'ohp',
        benchmark_value: 60,
        benchmark_unit: 'kg',
        training_max_percentage: 90,
      });

      // Upsert (update) without providing training_max_percentage — should preserve 90
      const updated = await vitestInvoke<any>('test_upsertUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'ohp',
        benchmark_value: 65,
        benchmark_unit: 'kg',
      });

      expect(updated).toBeDefined();
      expect(updated.benchmark_value).toBe(65);
      expect(updated.training_max_percentage).toBe(90);
    });
  });

  describe('getUserBenchmark', () => {
    it('should find benchmark by name', async () => {
      await vitestInvoke('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'squat',
        benchmark_value: 140,
        benchmark_unit: 'kg',
      });

      const result = await vitestInvoke<any>('test_getUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'squat',
      });

      expect(result).toBeDefined();
      expect(result.benchmark_name).toBe('squat');
      expect(result.benchmark_value).toBe(140);
    });

    it('should return undefined for non-existent name', async () => {
      const result = await vitestInvoke('test_getUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'nonexistent',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('getUserBenchmarks', () => {
    it('should return all benchmarks for user', async () => {
      await vitestInvoke('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'squat',
        benchmark_value: 140,
        benchmark_unit: 'kg',
      });
      await vitestInvoke('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'bench_press',
        benchmark_value: 100,
        benchmark_unit: 'kg',
      });

      const results = await vitestInvoke<any[]>('test_getUserBenchmarks', {
        tenant_id: TENANT_A,
        user_id: USER_A,
      });

      expect(results).toHaveLength(2);
    });

    it('should return empty for user with no benchmarks', async () => {
      const results = await vitestInvoke<any[]>('test_getUserBenchmarks', {
        tenant_id: TENANT_A,
        user_id: USER_A,
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('calculateTrainingMax', () => {
    it('should calculate value * percentage / 100', async () => {
      const result = await vitestInvoke<number | null>('test_calculateTrainingMax', {
        benchmark_value: 100,
        training_max_percentage: 90,
      });

      expect(result).toBe(90);
    });

    it('should return null for null benchmark_value', async () => {
      const result = await vitestInvoke<number | null>('test_calculateTrainingMax', {
        benchmark_value: null as any,
        training_max_percentage: 90,
      });

      expect(result).toBeNull();
    });

    it('should handle 100% percentage', async () => {
      const result = await vitestInvoke<number | null>('test_calculateTrainingMax', {
        benchmark_value: 100,
        training_max_percentage: 100,
      });

      expect(result).toBe(100);
    });

    it('should handle 90% percentage (Wendler)', async () => {
      const result = await vitestInvoke<number | null>('test_calculateTrainingMax', {
        benchmark_value: 140,
        training_max_percentage: 90,
      });

      expect(result).toBe(126);
    });
  });

  describe('getTrainingMaxForExercise', () => {
    it('should return training max with conversion factor', async () => {
      // Create exercise with benchmark_target and conversion_factor
      const exercise = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Close Grip Bench',
        movement_category: 'horizontal_push',
        exercise_type: 'dynamic',
        benchmark_target: 'bench_press',
        conversion_factor: 0.9,
      });

      // Create user benchmark
      await vitestInvoke('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'bench_press',
        benchmark_value: 100,
        benchmark_unit: 'kg',
        training_max_percentage: 90,
      });

      const result = await vitestInvoke<any>('test_getTrainingMaxForExercise', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        exercise_id: exercise.id,
      });

      expect(result).toBeDefined();
      expect(result.training_max).toBe(81); // 100 * (90/100) * 0.9 = 81
      expect(result.benchmark).toBeDefined();
    });

    it('should return null when exercise has no benchmark_target', async () => {
      const exercise = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Plank',
        movement_category: 'core',
        exercise_type: 'isometric',
      });

      const result = await vitestInvoke<any>('test_getTrainingMaxForExercise', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        exercise_id: exercise.id,
      });

      expect(result).toBeDefined();
      expect(result.training_max).toBeNull();
      expect(result.benchmark).toBeNull();
    });

    it('should return null when no benchmark exists for user', async () => {
      const exercise = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Bench Press',
        movement_category: 'horizontal_push',
        exercise_type: 'dynamic',
        benchmark_target: 'bench_press',
      });

      // No benchmark created for user
      const result = await vitestInvoke<any>('test_getTrainingMaxForExercise', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        exercise_id: exercise.id,
      });

      expect(result).toBeDefined();
      expect(result.training_max).toBeNull();
      expect(result.benchmark).toBeNull();
    });

    it('should apply conversion factor when present', async () => {
      const exercise = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Pause Bench',
        movement_category: 'horizontal_push',
        exercise_type: 'dynamic',
        benchmark_target: 'bench_press',
        conversion_factor: 0.85,
      });

      await vitestInvoke('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'bench_press',
        benchmark_value: 100,
        benchmark_unit: 'kg',
        training_max_percentage: 100,
      });

      const result = await vitestInvoke<any>('test_getTrainingMaxForExercise', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        exercise_id: exercise.id,
      });

      // 100 * (100/100) * 0.85 = 85
      expect(result.training_max).toBe(85);
    });
  });

  describe('updateUserBenchmark', () => {
    it('should update benchmark_value', async () => {
      const created = await vitestInvoke<any>('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'squat',
        benchmark_value: 140,
        benchmark_unit: 'kg',
      });

      const updated = await vitestInvoke<any>('test_updateUserBenchmark', {
        id: created.id,
        tenant_id: TENANT_A,
        benchmark_value: 150,
      });

      expect(updated).toBeDefined();
      expect(updated.benchmark_value).toBe(150);
    });

    it('should update training_max_percentage', async () => {
      const created = await vitestInvoke<any>('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'deadlift',
        benchmark_value: 180,
        benchmark_unit: 'kg',
      });

      const updated = await vitestInvoke<any>('test_updateUserBenchmark', {
        id: created.id,
        tenant_id: TENANT_A,
        training_max_percentage: 85,
      });

      expect(updated).toBeDefined();
      expect(updated.training_max_percentage).toBe(85);
    });

    it('should filter by tenant_id and optional user_id', async () => {
      const created = await vitestInvoke<any>('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'squat',
        benchmark_value: 140,
        benchmark_unit: 'kg',
      });

      // Should fail with wrong tenant
      const notUpdated = await vitestInvoke<any>('test_updateUserBenchmark', {
        id: created.id,
        tenant_id: TENANT_B,
        benchmark_value: 999,
      });
      expect(notUpdated).toBeUndefined();

      // Should succeed with correct tenant
      const updated = await vitestInvoke<any>('test_updateUserBenchmark', {
        id: created.id,
        tenant_id: TENANT_A,
        benchmark_value: 150,
      });
      expect(updated).toBeDefined();
      expect(updated.benchmark_value).toBe(150);
    });
  });

  describe('deleteUserBenchmark', () => {
    it('should delete by id and return true', async () => {
      const created = await vitestInvoke<any>('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'squat',
        benchmark_value: 140,
        benchmark_unit: 'kg',
      });

      const deleted = await vitestInvoke<boolean>('test_deleteUserBenchmark', {
        id: created.id,
        tenant_id: TENANT_A,
      });

      expect(deleted).toBe(true);

      // Verify it's gone
      const found = await vitestInvoke('test_getUserBenchmarkById', {
        id: created.id,
        tenant_id: TENANT_A,
      });
      expect(found).toBeUndefined();
    });

    it('should filter by tenant_id', async () => {
      const created = await vitestInvoke<any>('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'squat',
        benchmark_value: 140,
        benchmark_unit: 'kg',
      });

      const deleted = await vitestInvoke<boolean>('test_deleteUserBenchmark', {
        id: created.id,
        tenant_id: TENANT_B,
      });

      expect(deleted).toBe(false);
    });
  });

  describe('deleteUserBenchmarkByName', () => {
    it('should delete by name and return true', async () => {
      await vitestInvoke('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'bench_press',
        benchmark_value: 100,
        benchmark_unit: 'kg',
      });

      const deleted = await vitestInvoke<boolean>('test_deleteUserBenchmarkByName', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'bench_press',
      });

      expect(deleted).toBe(true);

      // Verify gone
      const found = await vitestInvoke('test_getUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'bench_press',
      });
      expect(found).toBeUndefined();
    });

    it('should return false for non-existent name', async () => {
      const deleted = await vitestInvoke<boolean>('test_deleteUserBenchmarkByName', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'nonexistent',
      });

      expect(deleted).toBe(false);
    });
  });

  describe('getUserBenchmarkById', () => {
    it('should find benchmark by id', async () => {
      const created = await vitestInvoke<any>('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'squat',
        benchmark_value: 140,
        benchmark_unit: 'kg',
      });

      const result = await vitestInvoke<any>('test_getUserBenchmarkById', {
        id: created.id,
        tenant_id: TENANT_A,
      });

      expect(result).toBeDefined();
      expect(result.benchmark_name).toBe('squat');
      expect(result.benchmark_value).toBe(140);
    });

    it('should return undefined for non-existent id', async () => {
      const result = await vitestInvoke('test_getUserBenchmarkById', {
        id: 'non-existent-uuid',
        tenant_id: TENANT_A,
      });

      expect(result).toBeUndefined();
    });
  });

  // ===========================================================================
  // Multi-tenant Isolation Suite
  // ===========================================================================

  describe('Multi-tenant isolation', () => {
    it('should not return exercises from another tenant via getExercisesForTenant', async () => {
      await vitestInvoke('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Tenant A Secret',
        movement_category: 'core',
        exercise_type: 'dynamic',
      });
      await vitestInvoke('test_createExercise', {
        tenant_id: TENANT_B,
        name: 'Tenant B Secret',
        movement_category: 'core',
        exercise_type: 'dynamic',
      });

      const tenantAResults = await vitestInvoke<any[]>('test_getExercisesForTenant', TENANT_A);
      const tenantBResults = await vitestInvoke<any[]>('test_getExercisesForTenant', TENANT_B);

      expect(tenantAResults.some((r: any) => r.name === 'Tenant B Secret')).toBe(false);
      expect(tenantBResults.some((r: any) => r.name === 'Tenant A Secret')).toBe(false);
    });

    it('should not update exercise belonging to another tenant', async () => {
      const created = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Protected Exercise',
        movement_category: 'core',
        exercise_type: 'dynamic',
      });

      const result = await vitestInvoke<any>('test_updateExercise', {
        id: created.id,
        tenant_id: TENANT_B,
        name: 'Hacked!',
      });

      expect(result).toBeUndefined();

      // Original should still be intact
      const original = await vitestInvoke<any>('test_getExerciseById', { id: created.id });
      expect(original.name).toBe('Protected Exercise');
    });

    it('should not delete exercise belonging to another tenant', async () => {
      const created = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TENANT_A,
        name: 'Safe Exercise',
        movement_category: 'core',
        exercise_type: 'dynamic',
      });

      const deleted = await vitestInvoke<boolean>('test_deleteExercise', {
        id: created.id,
        tenant_id: TENANT_B,
      });

      expect(deleted).toBe(false);

      // Should still exist
      const found = await vitestInvoke<any>('test_getExerciseById', { id: created.id });
      expect(found).toBeDefined();
    });

    it('should not access benchmarks from another tenant', async () => {
      await vitestInvoke('test_createUserBenchmark', {
        tenant_id: TENANT_A,
        user_id: USER_A,
        benchmark_name: 'secret_bench',
        benchmark_value: 200,
        benchmark_unit: 'kg',
      });

      // Try to read with wrong tenant
      const found = await vitestInvoke('test_getUserBenchmark', {
        tenant_id: TENANT_B,
        user_id: USER_A,
        benchmark_name: 'secret_bench',
      });
      expect(found).toBeUndefined();

      // Try to delete with wrong tenant
      const deleted = await vitestInvoke<boolean>('test_deleteUserBenchmark', {
        id: 'any-id',
        tenant_id: TENANT_B,
      });
      expect(deleted).toBe(false);
    });
  });
});
