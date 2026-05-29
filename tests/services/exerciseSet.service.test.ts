import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TEST_TENANT = 'tenant-exercise-set-test';
const TEST_USER = 'user-exercise-set-test';

describe('ExerciseSet Service - Integration Tests', () => {
  let planId: string;
  let sessionId: string;
  let exerciseDictId: string;
  let sessionExerciseId: string;

  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TEST_TENANT);
    await vitestInvoke('test_cleanTrainingPlanData', TEST_TENANT);

    // Create a User record first
    const user = await vitestInvoke<any>('test_createUser', {
      id: TEST_USER,
      tenant_id: TEST_TENANT,
      email: 'test-set@training.com',
      role: 'athlete',
    });

    // 1. Create a system plan
    const plan = await vitestInvoke<any>('test_createTrainingPlan', {
      tenant_id: TEST_TENANT,
      name: 'Strength block',
    });
    planId = plan.id;

    // 2. Create an exercise dictionary entry
    const exercise = await vitestInvoke<any>('test_createExercise', {
      tenant_id: TEST_TENANT,
      name: 'Barbell Squat',
      movement_category: 'squat',
      exercise_type: 'dynamic',
    });
    exerciseDictId = exercise.id;

    // 3. Create a session
    const session = await vitestInvoke<any>('test_createTrainingSession', {
      tenant_id: TEST_TENANT,
      plan_id: planId,
      session_name: 'Leg Day',
      week_number: 1,
    });
    sessionId = session.id;

    // 4. Create a session exercise
    const sessionExercise = await vitestInvoke<any>('test_createSessionExercise', {
      tenant_id: TEST_TENANT,
      session_id: sessionId,
      exercise_dictionary_id: exerciseDictId,
      order_in_session: 1,
      prescribed_rest_min: 3,
      prescribed_rest_max: 5,
    });
    sessionExerciseId = sessionExercise.id;
  });

  describe('createExerciseSet', () => {
    it('should create an exercise set with prescribed values', async () => {
      const result = await vitestInvoke<any>('test_createExerciseSet', {
        tenant_id: TEST_TENANT,
        session_exercise_id: sessionExerciseId,
        set_number: 1,
        conversion_factor: 0.9,
        prescribed_reps_min: 5,
        prescribed_reps_max: 5,
        prescribed_weight: 100,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.tenant_id).toBe(TEST_TENANT);
      expect(result.session_exercise_id).toBe(sessionExerciseId);
      expect(result.set_number).toBe(1);
      expect(result.conversion_factor).toBe(0.9);
      expect(result.prescribed_reps_min).toBe(5);
      expect(result.prescribed_reps_max).toBe(5);
      expect(result.prescribed_weight).toBe(100);
      expect(result.actual_reps).toBeNull();
      expect(result.is_completed).toBe(0);
      expect(result.is_voice_entry).toBe(0);
    });
  });

  describe('getExerciseSetById', () => {
    it('should retrieve an exercise set by id', async () => {
      const created = await vitestInvoke<any>('test_createExerciseSet', {
        tenant_id: TEST_TENANT,
        session_exercise_id: sessionExerciseId,
        set_number: 1,
        prescribed_weight: 80,
      });

      const found = await vitestInvoke<any>('test_getExerciseSetById', {
        id: created.id,
        tenant_id: TEST_TENANT,
      });

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.prescribed_weight).toBe(80);
    });

    it('should return undefined for non-existent id or wrong tenant', async () => {
      const created = await vitestInvoke<any>('test_createExerciseSet', {
        tenant_id: TEST_TENANT,
        session_exercise_id: sessionExerciseId,
        set_number: 1,
      });

      const wrongTenant = await vitestInvoke<any>('test_getExerciseSetById', {
        id: created.id,
        tenant_id: 'other-tenant',
      });
      expect(wrongTenant).toBeUndefined();
    });
  });

  describe('getExerciseSetsBySessionExercise', () => {
    it('should retrieve all sets for a session exercise in order', async () => {
      await vitestInvoke('test_createExerciseSet', {
        tenant_id: TEST_TENANT,
        session_exercise_id: sessionExerciseId,
        set_number: 2,
      });

      await vitestInvoke('test_createExerciseSet', {
        tenant_id: TEST_TENANT,
        session_exercise_id: sessionExerciseId,
        set_number: 1,
      });

      const sets = await vitestInvoke<any[]>('test_getExerciseSetsBySessionExercise', {
        session_exercise_id: sessionExerciseId,
        tenant_id: TEST_TENANT,
      });

      expect(sets).toHaveLength(2);
      expect(sets[0].set_number).toBe(1);
      expect(sets[1].set_number).toBe(2);
    });
  });

  describe('updateExerciseSet', () => {
    it('should update athlete actual performance and complete status', async () => {
      const created = await vitestInvoke<any>('test_createExerciseSet', {
        tenant_id: TEST_TENANT,
        session_exercise_id: sessionExerciseId,
        set_number: 1,
        prescribed_reps_min: 5,
        prescribed_reps_max: 8,
      });

      const updated = await vitestInvoke<any>('test_updateExerciseSet', {
        id: created.id,
        tenant_id: TEST_TENANT,
        actual_reps: 6,
        actual_weight: 90,
        rpe: 8.5,
        is_completed: 1,
        is_voice_entry: 1,
      });

      expect(updated).toBeDefined();
      expect(updated.actual_reps).toBe(6);
      expect(updated.actual_weight).toBe(90);
      expect(updated.rpe).toBe(8.5);
      expect(updated.is_completed).toBe(1);
      expect(updated.is_voice_entry).toBe(1);
      expect(updated.prescribed_reps_min).toBe(5); // Unchanged
    });
  });

  describe('deleteExerciseSet', () => {
    it('should delete set by id', async () => {
      const created = await vitestInvoke<any>('test_createExerciseSet', {
        tenant_id: TEST_TENANT,
        session_exercise_id: sessionExerciseId,
        set_number: 1,
      });

      const deleted = await vitestInvoke<boolean>('test_deleteExerciseSet', {
        id: created.id,
        tenant_id: TEST_TENANT,
      });
      expect(deleted).toBe(true);

      const found = await vitestInvoke<any>('test_getExerciseSetById', {
        id: created.id,
        tenant_id: TEST_TENANT,
      });
      expect(found).toBeUndefined();
    });
  });
});
