import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TEST_TENANT = 'tenant-test';

describe('libraryRouter Integration Tests', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TEST_TENANT);
  });

  describe('addExercise & getExercises', () => {
    it('should create a master exercise and be able to fetch it', async () => {
      const result = await vitestInvoke<any>('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Back Squat',
        movement_category: 'squat',
        progression_level: 5,
        exercise_type: 'dynamic',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Back Squat');
      expect(result.master_exercise_id).toBeNull();
      expect(result.id).toBeDefined();

      const fetchResult = await vitestInvoke<any>('test_library_getExercises', {
        tenant_id: TEST_TENANT,
        movement_category: 'squat'
      });

      expect(fetchResult.length).toBe(1);
      expect(fetchResult[0].name).toBe('Back Squat');
    });

    it('should create a child exercise with master reference', async () => {
      const master = await vitestInvoke<any>('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Back Squat',
        movement_category: 'squat',
        progression_level: 5,
        exercise_type: 'dynamic',
      });

      const child = await vitestInvoke<any>('test_library_addExercise', {
        tenant_id: TEST_TENANT,
        name: 'Goblet Squat',
        movement_category: 'squat',
        progression_level: 2,
        exercise_type: 'dynamic',
        master_exercise_id: master.id,
        conversion_factor: 0.7
      });

      expect(child).toBeDefined();
      expect(child.name).toBe('Goblet Squat');
      expect(child.master_exercise_id).toBe(master.id);
      expect(child.conversion_factor).toBe(0.7);
    });
  });

  describe('saveUserBenchmark', () => {
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
      // Ensure it updated the same row, not inserted a new one (assuming id exists/tracked internally)
      expect(updateResult.id).toBe(saveResult.id);
    });
  });
});
