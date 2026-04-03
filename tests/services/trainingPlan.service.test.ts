import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TENANT_X = 'tenant-plan-x';
const TENANT_Y = 'tenant-plan-y';

describe('TrainingPlan Service - Multi-Tenancy Isolation Tests', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TENANT_X);
    await vitestInvoke('test_cleanDatabase', TENANT_Y);
    await vitestInvoke('test_cleanTrainingPlanData', TENANT_X);
    await vitestInvoke('test_cleanTrainingPlanData', TENANT_Y);
  });

  describe('Plan-level tenant isolation', () => {
    it('should not return Plan A (Tenant X) when querying plans for Tenant Y', async () => {
      // Create plan for Tenant X
      const planX = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: TENANT_X,
        name: 'Plan A - Tenant X',
      });

      expect(planX).toBeDefined();
      expect(planX.tenant_id).toBe(TENANT_X);

      // Query plans for Tenant Y - should NOT include Plan A
      const plansY = await vitestInvoke<any[]>('test_getTrainingPlansForTenant', TENANT_Y);

      // Tenant Y's plans should not contain Plan X
      const found = plansY?.find((p: any) => p.id === planX.id);
      expect(found).toBeUndefined();
    });

    it('should return plans for correct tenant plus system templates', async () => {
      // Create a system template (tenant_id = null)
      const systemPlan = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: null,
        name: 'System Template Plan',
        is_system_template: 1,
      });

      // Create a tenant-specific plan
      const tenantPlan = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: TENANT_X,
        name: 'Tenant X Plan',
      });

      const plans = await vitestInvoke<any[]>('test_getTrainingPlansForTenant', TENANT_X);

      // Should include both the system template and tenant plan
      const planIds = plans.map((p: any) => p.id);
      expect(planIds).toContain(systemPlan.id);
      expect(planIds).toContain(tenantPlan.id);
    });

    it('should enforce tenant isolation on getTrainingPlanById', async () => {
      const planX = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: TENANT_X,
        name: 'Plan A',
      });

      // Query with correct tenant
      const found = await vitestInvoke<any>('test_getTrainingPlanById', {
        id: planX.id,
        tenant_id: TENANT_X,
      });
      expect(found).toBeDefined();
      expect(found.id).toBe(planX.id);

      // Query with wrong tenant
      const notFound = await vitestInvoke<any>('test_getTrainingPlanById', {
        id: planX.id,
        tenant_id: TENANT_Y,
      });
      expect(notFound).toBeUndefined();
    });
  });

  describe('Session-level tenant isolation', () => {
    it('should not return sessions for Plan A (Tenant X) when querying with Tenant Y context', async () => {
      // Create plan and session for Tenant X
      const planX = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: TENANT_X,
        name: 'Plan A - Tenant X',
      });

      const sessionX = await vitestInvoke<any>('test_createTrainingSession', {
        tenant_id: TENANT_X,
        plan_id: planX.id,
        block_name: 'Block 1',
        week_number: 1,
        day_of_week: 'Monday',
        session_name: 'Upper Body',
      });

      expect(sessionX).toBeDefined();
      expect(sessionX.tenant_id).toBe(TENANT_X);

      // Create plan for Tenant Y (different plan)
      const planY = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: TENANT_Y,
        name: 'Plan B - Tenant Y',
      });

      const sessionY = await vitestInvoke<any>('test_createTrainingSession', {
        tenant_id: TENANT_Y,
        plan_id: planY.id,
        block_name: 'Block 1',
        week_number: 1,
        day_of_week: 'Monday',
        session_name: 'Lower Body',
      });

      // Get sessions for Plan Y - should NOT include Session X
      const sessionsPlanY = await vitestInvoke<any[]>('test_getTrainingSessionsByPlan', planY.id);
      expect(sessionsPlanY).toHaveLength(1);
      expect(sessionsPlanY[0].id).toBe(sessionY.id);

      // Get sessions for Plan X - should NOT include Session Y
      const sessionsPlanX = await vitestInvoke<any[]>('test_getTrainingSessionsByPlan', planX.id);
      expect(sessionsPlanX).toHaveLength(1);
      expect(sessionsPlanX[0].id).toBe(sessionX.id);
    });

    it('should enforce tenant isolation on getTrainingSessionById', async () => {
      const planX = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: TENANT_X,
        name: 'Plan A',
      });

      const sessionX = await vitestInvoke<any>('test_createTrainingSession', {
        tenant_id: TENANT_X,
        plan_id: planX.id,
        week_number: 1,
        day_of_week: 'Monday',
      });

      // Query with correct tenant
      const found = await vitestInvoke<any>('test_getTrainingSessionById', {
        id: sessionX.id,
        tenant_id: TENANT_X,
      });
      expect(found).toBeDefined();

      // Query with wrong tenant
      const notFound = await vitestInvoke<any>('test_getTrainingSessionById', {
        id: sessionX.id,
        tenant_id: TENANT_Y,
      });
      expect(notFound).toBeUndefined();
    });

    it('should isolate sessions by week queries per plan', async () => {
      const planX = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: TENANT_X,
        name: 'Plan A',
      });

      await vitestInvoke<any>('test_createTrainingSession', {
        tenant_id: TENANT_X,
        plan_id: planX.id,
        week_number: 1,
        day_of_week: 'Monday',
        session_name: 'Session X',
      });

      const planY = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: TENANT_Y,
        name: 'Plan B',
      });

      await vitestInvoke<any>('test_createTrainingSession', {
        tenant_id: TENANT_Y,
        plan_id: planY.id,
        week_number: 1,
        day_of_week: 'Monday',
        session_name: 'Session Y',
      });

      // Week query for Plan X should only return Session X
      const weekX = await vitestInvoke<any[]>('test_getTrainingSessionsByWeek', {
        plan_id: planX.id,
        week_number: 1,
      });
      expect(weekX).toHaveLength(1);
      expect(weekX[0].session_name).toBe('Session X');

      // Week query for Plan Y should only return Session Y
      const weekY = await vitestInvoke<any[]>('test_getTrainingSessionsByWeek', {
        plan_id: planY.id,
        week_number: 1,
      });
      expect(weekY).toHaveLength(1);
      expect(weekY[0].session_name).toBe('Session Y');
    });
  });

  describe('Exercise-level tenant isolation', () => {
    it('should not return exercises for Session A (Tenant X) when querying with Tenant Y context', async () => {
      // Create exercise dictionary entries
      const exercise = await vitestInvoke<any>('test_createExercise', {
        tenant_id: null, // System exercise available to all
        name: 'Bench Press',
        movement_category: 'horizontal_push',
        exercise_type: 'dynamic',
      });

      const planX = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: TENANT_X,
        name: 'Plan A',
      });

      const sessionX = await vitestInvoke<any>('test_createTrainingSession', {
        tenant_id: TENANT_X,
        plan_id: planX.id,
        week_number: 1,
        day_of_week: 'Monday',
      });

      // Create exercise for Session X (Tenant X)
      const exerciseX = await vitestInvoke<any>('test_createSessionExercise', {
        tenant_id: TENANT_X,
        session_id: sessionX.id,
        exercise_dictionary_id: exercise.id,
        order_in_session: 1,
        target_sets: 3,
        target_reps: '5',
      });

      expect(exerciseX).toBeDefined();
      expect(exerciseX.tenant_id).toBe(TENANT_X);

      // Exercises for Session X should be accessible via that session
      const exercisesForSessionX = await vitestInvoke<any[]>('test_getSessionExercisesBySession', {
        session_id: sessionX.id,
      });
      expect(exercisesForSessionX).toHaveLength(1);
      expect(exercisesForSessionX[0].id).toBe(exerciseX.id);

      // Create a separate session for Tenant Y
      const planY = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: TENANT_Y,
        name: 'Plan B',
      });

      const sessionY = await vitestInvoke<any>('test_createTrainingSession', {
        tenant_id: TENANT_Y,
        plan_id: planY.id,
        week_number: 1,
        day_of_week: 'Monday',
      });

      // Exercises for Session Y should be empty (no exercises added to Y's session)
      const exercisesForSessionY = await vitestInvoke<any[]>('test_getSessionExercisesBySession', {
        session_id: sessionY.id,
      });
      expect(exercisesForSessionY).toHaveLength(0);
    });

    it('should enforce tenant isolation on getSessionExerciseById', async () => {
      const exercise = await vitestInvoke<any>('test_createExercise', {
        tenant_id: null,
        name: 'Squat',
        movement_category: 'knee_dominant',
        exercise_type: 'dynamic',
      });

      const planX = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: TENANT_X,
        name: 'Plan A',
      });

      const sessionX = await vitestInvoke<any>('test_createTrainingSession', {
        tenant_id: TENANT_X,
        plan_id: planX.id,
        week_number: 1,
      });

      const exerciseX = await vitestInvoke<any>('test_createSessionExercise', {
        tenant_id: TENANT_X,
        session_id: sessionX.id,
        exercise_dictionary_id: exercise.id,
        order_in_session: 1,
      });

      // Query with correct tenant
      const found = await vitestInvoke<any>('test_getSessionExerciseById', {
        id: exerciseX.id,
        tenant_id: TENANT_X,
      });
      expect(found).toBeDefined();
      expect(found.id).toBe(exerciseX.id);

      // Query with wrong tenant
      const notFound = await vitestInvoke<any>('test_getSessionExerciseById', {
        id: exerciseX.id,
        tenant_id: TENANT_Y,
      });
      expect(notFound).toBeUndefined();
    });
  });

  describe('Full plan retrieval respects tenant boundaries', () => {
    it('should return full plan only for the owning tenant', async () => {
      // Create exercise dictionary
      const exercise = await vitestInvoke<any>('test_createExercise', {
        tenant_id: null,
        name: 'Deadlift',
        movement_category: 'hip_hinge',
        exercise_type: 'dynamic',
      });

      // Create full plan structure for Tenant X
      const planX = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: TENANT_X,
        name: 'Full Plan X',
      });

      const sessionX = await vitestInvoke<any>('test_createTrainingSession', {
        tenant_id: TENANT_X,
        plan_id: planX.id,
        week_number: 1,
        day_of_week: 'Monday',
        session_name: 'Pull Day',
      });

      await vitestInvoke<any>('test_createSessionExercise', {
        tenant_id: TENANT_X,
        session_id: sessionX.id,
        exercise_dictionary_id: exercise.id,
        order_in_session: 1,
        target_sets: 5,
        target_reps: '3',
      });

      // Retrieve full plan with correct tenant
      const fullPlanX = await vitestInvoke<any>('test_getFullTrainingPlan', {
        id: planX.id,
        tenant_id: TENANT_X,
      });

      expect(fullPlanX).toBeDefined();
      expect(fullPlanX.id).toBe(planX.id);
      expect(fullPlanX.sessions).toHaveLength(1);
      expect(fullPlanX.sessions[0].exercises).toHaveLength(1);
      expect(fullPlanX.sessions[0].session_name).toBe('Pull Day');

      // Retrieve full plan with wrong tenant
      const fullPlanY = await vitestInvoke<any>('test_getFullTrainingPlan', {
        id: planX.id,
        tenant_id: TENANT_Y,
      });

      expect(fullPlanY).toBeUndefined();
    });

    it('should not leak sessions from other tenants in full plan', async () => {
      const exercise = await vitestInvoke<any>('test_createExercise', {
        tenant_id: null,
        name: 'Overhead Press',
        movement_category: 'vertical_push',
        exercise_type: 'dynamic',
      });

      // Create plans for both tenants
      const planX = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: TENANT_X,
        name: 'Plan X',
      });

      const planY = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: TENANT_Y,
        name: 'Plan Y',
      });

      // Add sessions to each plan
      await vitestInvoke<any>('test_createTrainingSession', {
        tenant_id: TENANT_X,
        plan_id: planX.id,
        week_number: 1,
        day_of_week: 'Monday',
        session_name: 'X Session',
      });

      await vitestInvoke<any>('test_createTrainingSession', {
        tenant_id: TENANT_Y,
        plan_id: planY.id,
        week_number: 1,
        day_of_week: 'Monday',
        session_name: 'Y Session',
      });

      // Verify Plan X only has X sessions
      const fullPlanX = await vitestInvoke<any>('test_getFullTrainingPlan', {
        id: planX.id,
        tenant_id: TENANT_X,
      });
      expect(fullPlanX.sessions).toHaveLength(1);
      expect(fullPlanX.sessions[0].session_name).toBe('X Session');

      // Verify Plan Y only has Y sessions
      const fullPlanY = await vitestInvoke<any>('test_getFullTrainingPlan', {
        id: planY.id,
        tenant_id: TENANT_Y,
      });
      expect(fullPlanY.sessions).toHaveLength(1);
      expect(fullPlanY.sessions[0].session_name).toBe('Y Session');
    });
  });
});
