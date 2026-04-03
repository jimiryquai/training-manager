import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TEST_TENANT = 'tenant-library-test';
const TEST_TENANT_B = 'tenant-library-test-b'; // For multi-tenant isolation
// Must match the hardcoded userId in test_library_* utilities
const TEST_USER = 'test-user';

describe('libraryRouter Integration Tests', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TEST_TENANT);
    await vitestInvoke('test_cleanDatabase', TEST_TENANT_B);
  });

  // ===========================================================================
  // EXERCISE CRUD
  // ===========================================================================

  describe('addExercise & getExercises', () => {
    it('should create an exercise and be able to fetch it', async () => {
      const result = await vitestInvoke<any>('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Back Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Back Squat');
      expect(result.id).toBeDefined();
      expect(result.movement_category).toBe('squat');
      expect(result.exercise_type).toBe('dynamic');

      const fetchResult = await vitestInvoke<any>('test_library_getExercises', {
        tenant_id: TEST_TENANT,
        movement_category: 'squat'
      });

      expect(fetchResult.length).toBe(1);
      expect(fetchResult[0].name).toBe('Back Squat');
    });

    it('should create an exercise with benchmark target and conversion factor', async () => {
      // First create the "master" exercise
      await vitestInvoke('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Back Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
        benchmark_target: 'back_squat',
      });

      // Then create a variant with conversion factor
      const variant = await vitestInvoke<any>('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Goblet Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
        benchmark_target: 'back_squat',
        conversion_factor: 0.7
      });

      expect(variant).toBeDefined();
      expect(variant.name).toBe('Goblet Squat');
      expect(variant.benchmark_target).toBe('back_squat');
      expect(variant.conversion_factor).toBe(0.7);
    });
  });

  describe('updateExercise', () => {
    it('should update exercise name', async () => {
      const created = await vitestInvoke<any>('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Back Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
      });

      const updated = await vitestInvoke<any>('test_library_updateExercise', {
        tenant_id: TEST_TENANT,
        id: created.id,
        name: 'High Bar Back Squat',
      });

      expect(updated).toBeDefined();
      expect(updated.name).toBe('High Bar Back Squat');
    });

    it('should update benchmark_target', async () => {
      const created = await vitestInvoke<any>('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Front Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
      });

      const updated = await vitestInvoke<any>('test_library_updateExercise', {
        tenant_id: TEST_TENANT,
        id: created.id,
        benchmark_target: 'back_squat',
      });

      expect(updated).toBeDefined();
      expect(updated.benchmark_target).toBe('back_squat');
    });

    it('should not update exercise from another tenant', async () => {
      // Create exercise in tenant A
      const created = await vitestInvoke<any>('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Back Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
      });

      // Try to update from tenant B
      const updated = await vitestInvoke<any>('test_library_updateExercise', {
        tenant_id: TEST_TENANT_B,
        id: created.id,
        name: 'Hacked Squat',
      });

      // Should return undefined (no rows matched tenant filter)
      expect(updated).toBeUndefined();
    });
  });

  describe('deleteExercise', () => {
    it('should delete exercise and return true', async () => {
      const created = await vitestInvoke<any>('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Back Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
      });

      const result = await vitestInvoke<boolean>('test_library_deleteExercise', {
        tenant_id: TEST_TENANT,
        id: created.id,
      });

      expect(result).toBe(true);
    });

    it('should return false for nonexistent exercise', async () => {
      const result = await vitestInvoke<boolean>('test_library_deleteExercise', {
        tenant_id: TEST_TENANT,
        id: 'nonexistent-id',
      });

      expect(result).toBe(false);
    });
  });

  describe('getExercisesByBenchmark', () => {
    it('should find exercises by benchmark_target', async () => {
      // Create exercises with the same benchmark target
      await vitestInvoke('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Back Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
        benchmark_target: 'back_squat',
      });

      await vitestInvoke('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Front Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
        benchmark_target: 'back_squat',
      });

      // Create an exercise with different target
      await vitestInvoke('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Deadlift',
        movement_category: 'hinge',
        exercise_type: 'dynamic',
        benchmark_target: 'deadlift',
      });

      const result = await vitestInvoke<any[]>('test_library_getExercisesByBenchmark', {
        tenant_id: TEST_TENANT,
        benchmark_target: 'back_squat',
      });

      expect(result.length).toBe(2);
      expect(result.map((e: any) => e.name).sort()).toEqual(['Back Squat', 'Front Squat']);
    });
  });

  describe('getSystemExercises', () => {
    it('should return only global exercises (tenant_id = null)', async () => {
      // Create a system exercise using direct service call
      await vitestInvoke('test_createExercise', {
        tenant_id: null, // System exercise
        name: 'System Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
      });

      // Create a tenant exercise
      await vitestInvoke('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Tenant Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
      });

      const result = await vitestInvoke<any[]>('test_library_getSystemExercises', {
        tenant_id: TEST_TENANT,
      });

      // Should only include system exercises
      expect(result.some((e: any) => e.name === 'System Squat')).toBe(true);
      expect(result.some((e: any) => e.name === 'Tenant Squat')).toBe(false);
    });
  });

  // ===========================================================================
  // USER BENCHMARK CRUD
  // ===========================================================================

  describe('saveUserBenchmark', () => {
    beforeEach(async () => {
      // Create user first - required for FK constraint
      await vitestInvoke('test_createUser', {
        id: TEST_USER,
        email: 'library-test@example.com',
        tenant_id: TEST_TENANT,
      });
    });

    it('should save a user benchmark and update it', async () => {
      const saveResult = await vitestInvoke<any>('test_library_saveBenchmark', {
        tenant_id: TEST_TENANT,
        benchmark_name: 'Deadlift',
        benchmark_value: 200,
        benchmark_unit: 'lbs'
      });

      expect(saveResult).toBeDefined();
      expect(saveResult.benchmark_name).toBe('Deadlift');
      expect(saveResult.benchmark_value).toBe(200);

      const updateResult = await vitestInvoke<any>('test_library_saveBenchmark', {
        tenant_id: TEST_TENANT,
        benchmark_name: 'Deadlift',
        benchmark_value: 205,
        benchmark_unit: 'lbs'
      });

      expect(updateResult.benchmark_value).toBe(205);
      // Same record updated, not a new one
      expect(updateResult.id).toBe(saveResult.id);
    });
  });

  describe('getUserBenchmark', () => {
    beforeEach(async () => {
      await vitestInvoke('test_createUser', {
        id: TEST_USER,
        email: 'library-test@example.com',
        tenant_id: TEST_TENANT,
      });
    });

    it('should return benchmark by name', async () => {
      await vitestInvoke('test_library_saveBenchmark', {
        tenant_id: TEST_TENANT,
        benchmark_name: 'Back Squat',
        benchmark_value: 315,
        benchmark_unit: 'lbs',
      });

      const result = await vitestInvoke<any>('test_library_getUserBenchmark', {
        tenant_id: TEST_TENANT,
        benchmark_name: 'Back Squat',
      });

      expect(result).toBeDefined();
      expect(result.benchmark_name).toBe('Back Squat');
      expect(result.benchmark_value).toBe(315);
    });

    it('should return null for nonexistent benchmark', async () => {
      const result = await vitestInvoke<any>('test_library_getUserBenchmark', {
        tenant_id: TEST_TENANT,
        benchmark_name: 'Nonexistent',
      });

      // tRPC query returns undefined when no result found
      expect(result).toBeUndefined();
    });
  });

  describe('getUserBenchmarks', () => {
    beforeEach(async () => {
      await vitestInvoke('test_createUser', {
        id: TEST_USER,
        email: 'library-test@example.com',
        tenant_id: TEST_TENANT,
      });
    });

    it('should return all benchmarks for user', async () => {
      await vitestInvoke('test_library_saveBenchmark', {
        tenant_id: TEST_TENANT,
        benchmark_name: 'Back Squat',
        benchmark_value: 315,
        benchmark_unit: 'lbs',
      });

      await vitestInvoke('test_library_saveBenchmark', {
        tenant_id: TEST_TENANT,
        benchmark_name: 'Deadlift',
        benchmark_value: 405,
        benchmark_unit: 'lbs',
      });

      const result = await vitestInvoke<any[]>('test_library_getUserBenchmarks', {
        tenant_id: TEST_TENANT,
      });

      expect(result.length).toBe(2);
      expect(result.map((b: any) => b.benchmark_name).sort()).toEqual(['Back Squat', 'Deadlift']);
    });

    it('should return empty array for user with no benchmarks', async () => {
      const result = await vitestInvoke<any[]>('test_library_getUserBenchmarks', {
        tenant_id: TEST_TENANT,
      });

      expect(result).toEqual([]);
    });
  });

  describe('getTrainingMaxForExercise', () => {
    beforeEach(async () => {
      await vitestInvoke('test_createUser', {
        id: TEST_USER,
        email: 'library-test@example.com',
        tenant_id: TEST_TENANT,
      });
    });

    it('should calculate training max with conversion factor', async () => {
      // Create benchmark with 100lbs, 90% training max percentage
      await vitestInvoke('test_library_saveBenchmark', {
        tenant_id: TEST_TENANT,
        benchmark_name: 'back_squat',
        benchmark_value: 100,
        benchmark_unit: 'lbs',
        training_max_percentage: 90,
      });

      // Create exercise with 0.8 conversion factor
      const exercise = await vitestInvoke<any>('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Front Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
        benchmark_target: 'back_squat',
        conversion_factor: 0.8,
      });

      const result = await vitestInvoke<any>('test_library_getTrainingMaxForExercise', {
        tenant_id: TEST_TENANT,
        exercise_id: exercise.id,
      });

      // 100lbs * 90% * 0.8 = 72lbs
      expect(result.training_max).toBe(72);
      expect(result.benchmark).toBeDefined();
    });

    it('should return null when no benchmark exists', async () => {
      const exercise = await vitestInvoke<any>('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Zercher Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
        // No benchmark_target
      });

      const result = await vitestInvoke<any>('test_library_getTrainingMaxForExercise', {
        tenant_id: TEST_TENANT,
        exercise_id: exercise.id,
      });

      expect(result.training_max).toBeNull();
      expect(result.benchmark).toBeNull();
    });

    it('should return null when exercise has benchmark_target but no user benchmark', async () => {
      const exercise = await vitestInvoke<any>('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Pause Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
        benchmark_target: 'back_squat',
        // But user has no back_squat benchmark
      });

      const result = await vitestInvoke<any>('test_library_getTrainingMaxForExercise', {
        tenant_id: TEST_TENANT,
        exercise_id: exercise.id,
      });

      expect(result.training_max).toBeNull();
      expect(result.benchmark).toBeNull();
    });
  });

  // ===========================================================================
  // MULTI-TENANT ISOLATION
  // ===========================================================================

  describe('Multi-tenant isolation', () => {
    it('should not return exercises from another tenant', async () => {
      // Create exercise in tenant A
      await vitestInvoke('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Tenant A Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
      });

      // Create exercise in tenant B
      await vitestInvoke('test_library_addExercise', {
        tenant_id: TEST_TENANT_B,
        name: 'Tenant B Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
      });

      // Fetch from tenant A
      const resultA = await vitestInvoke<any[]>('test_library_getExercises', {
        tenant_id: TEST_TENANT,
        movement_category: 'squat',
      });

      // Fetch from tenant B
      const resultB = await vitestInvoke<any[]>('test_library_getExercises', {
        tenant_id: TEST_TENANT_B,
        movement_category: 'squat',
      });

      expect(resultA.length).toBe(1);
      expect(resultA[0].name).toBe('Tenant A Squat');

      expect(resultB.length).toBe(1);
      expect(resultB[0].name).toBe('Tenant B Squat');
    });

    it('should not return benchmarks from another tenant', async () => {
      // Create users in both tenants with DIFFERENT IDs
      await vitestInvoke('test_createUser', {
        id: 'user-tenant-a',
        email: 'user-a@example.com',
        tenant_id: TEST_TENANT,
      });

      await vitestInvoke('test_createUser', {
        id: 'user-tenant-b',
        email: 'user-b@example.com',
        tenant_id: TEST_TENANT_B,
      });

      // Create benchmark in tenant A using direct service (need to use a custom approach)
      // Since test_library_saveBenchmark uses hardcoded 'test-user', we'll use the upsert directly
      await vitestInvoke('test_upsertUserBenchmark', {
        tenant_id: TEST_TENANT,
        user_id: 'user-tenant-a',
        benchmark_name: 'Back Squat',
        benchmark_value: 315,
        benchmark_unit: 'lbs',
      });

      // Create benchmark in tenant B
      await vitestInvoke('test_upsertUserBenchmark', {
        tenant_id: TEST_TENANT_B,
        user_id: 'user-tenant-b',
        benchmark_name: 'Back Squat',
        benchmark_value: 225,
        benchmark_unit: 'lbs',
      });

      // Fetch benchmarks for each user
      const resultA = await vitestInvoke<any[]>('test_getUserBenchmarks', {
        tenant_id: TEST_TENANT,
        user_id: 'user-tenant-a',
      });

      const resultB = await vitestInvoke<any[]>('test_getUserBenchmarks', {
        tenant_id: TEST_TENANT_B,
        user_id: 'user-tenant-b',
      });

      // Each tenant should only see their own benchmark
      expect(resultA.length).toBe(1);
      expect(resultA[0].benchmark_value).toBe(315);

      expect(resultB.length).toBe(1);
      expect(resultB[0].benchmark_value).toBe(225);
    });
  });
});
