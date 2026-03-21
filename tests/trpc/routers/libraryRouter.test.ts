import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TEST_TENANT = 'tenant-library-test';
// Must match the hardcoded userId in test_library_saveBenchmark
const TEST_USER = 'test-user';

describe('libraryRouter Integration Tests', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TEST_TENANT);
  });

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
});
