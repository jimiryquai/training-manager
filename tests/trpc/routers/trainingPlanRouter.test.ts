import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TEST_TENANT_A = 'tenant-plan-test-a';
const TEST_TENANT_B = 'tenant-plan-test-b';

describe('trainingPlanRouter - Integration Tests', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TEST_TENANT_A);
    await vitestInvoke('test_cleanDatabase', TEST_TENANT_B);
  });

  describe('createPlan', () => {
    it('should create a training plan for the authenticated tenant', async () => {
      const result = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: '5/3/1 BBB',
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('5/3/1 BBB');
      expect(result.tenant_id).toBe(TEST_TENANT_A);
    });

    it('should set is_system_template to 0 by default', async () => {
      const result = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'Custom Plan',
      });

      expect(result.is_system_template).toBe(0);
    });

    it('should require name', async () => {
      // Empty name should fail Zod validation
      await expect(
        vitestInvoke('test_tp_createPlan', {
          tenant_id: TEST_TENANT_A,
          name: '',
        })
      ).rejects.toThrow();
    });
  });

  describe('getPlan', () => {
    it('should return plan by id for correct tenant', async () => {
      const created = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'Test Plan',
      });

      const result = await vitestInvoke<any>('test_tp_getPlan', {
        tenant_id: TEST_TENANT_A,
        id: created.id,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.name).toBe('Test Plan');
    });

    it('should return undefined for plan from another tenant', async () => {
      const created = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'Plan A',
      });

      // Try to access from Tenant B
      const result = await vitestInvoke<any>('test_tp_getPlan', {
        tenant_id: TEST_TENANT_B,
        id: created.id,
      });

      // getPlan filters by tenant_id, so cross-tenant access returns undefined
      expect(result).toBeUndefined();
    });
  });

  describe('getSystemPlans', () => {
    it('should return only system template plans', async () => {
      // Create a system template (using service directly with null tenant)
      await vitestInvoke('test_createTrainingPlan', {
        tenant_id: null,
        name: 'System Template 1',
        is_system_template: 1,
      });

      // Create a tenant plan
      await vitestInvoke('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'Tenant Plan',
      });

      const result = await vitestInvoke<any[]>('test_tp_getSystemPlans', {
        tenant_id: TEST_TENANT_A,
      });

      // Should only include system templates (tenant_id = null)
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(p => p.tenant_id === null)).toBe(true);
      expect(result.every(p => p.is_system_template === 1)).toBe(true);
    });
  });

  describe('getPlansForTenant', () => {
    it('should return system templates + tenant plans', async () => {
      // Create a system template
      await vitestInvoke('test_createTrainingPlan', {
        tenant_id: null,
        name: 'System Plan',
        is_system_template: 1,
      });

      // Create a tenant-specific plan
      const tenantPlan = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'Tenant A Plan',
      });

      const result = await vitestInvoke<any[]>('test_tp_getPlansForTenant', {
        tenant_id: TEST_TENANT_A,
      });

      // Should include both system and tenant-specific plans
      const systemPlans = result.filter(p => p.tenant_id === null);
      const tenantPlans = result.filter(p => p.tenant_id === TEST_TENANT_A);

      expect(systemPlans.length).toBeGreaterThan(0);
      expect(tenantPlans.some(p => p.id === tenantPlan.id)).toBe(true);
    });

    it('should not include plans from other tenants', async () => {
      // Create plans for Tenant A and Tenant B
      const planA = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'Plan A',
      });

      const planB = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_B,
        name: 'Plan B',
      });

      // Fetch plans for Tenant A
      const resultA = await vitestInvoke<any[]>('test_tp_getPlansForTenant', {
        tenant_id: TEST_TENANT_A,
      });

      // Should include Plan A but not Plan B
      const idsA = resultA.map(p => p.id);
      expect(idsA).toContain(planA.id);
      expect(idsA).not.toContain(planB.id);

      // Fetch plans for Tenant B
      const resultB = await vitestInvoke<any[]>('test_tp_getPlansForTenant', {
        tenant_id: TEST_TENANT_B,
      });

      const idsB = resultB.map(p => p.id);
      expect(idsB).toContain(planB.id);
      expect(idsB).not.toContain(planA.id);
    });
  });

  describe('updatePlan', () => {
    it('should update plan name for correct tenant', async () => {
      const created = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'Original Name',
      });

      const result = await vitestInvoke<any>('test_tp_updatePlan', {
        tenant_id: TEST_TENANT_A,
        id: created.id,
        name: 'Updated Name',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Name');
    });

    it('should return undefined for plan from another tenant', async () => {
      const created = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'Plan A',
      });

      // Try to update from Tenant B
      const result = await vitestInvoke<any>('test_tp_updatePlan', {
        tenant_id: TEST_TENANT_B,
        id: created.id,
        name: 'Hacked Name',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('deletePlan', () => {
    it('should delete plan and return truthy for correct tenant', async () => {
      const created = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'Plan to Delete',
      });

      const result = await vitestInvoke<boolean>('test_tp_deletePlan', {
        tenant_id: TEST_TENANT_A,
        id: created.id,
      });

      expect(result).toBe(true);

      // Verify it's gone
      const fetched = await vitestInvoke<any>('test_tp_getPlan', {
        tenant_id: TEST_TENANT_A,
        id: created.id,
      });
      expect(fetched).toBeUndefined();
    });

    it('should return false for plan from another tenant', async () => {
      const created = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'Plan A',
      });

      // Try to delete from Tenant B
      const result = await vitestInvoke<boolean>('test_tp_deletePlan', {
        tenant_id: TEST_TENANT_B,
        id: created.id,
      });

      expect(result).toBe(false);

      // Verify it still exists in Tenant A
      const fetched = await vitestInvoke<any>('test_tp_getPlan', {
        tenant_id: TEST_TENANT_A,
        id: created.id,
      });
      expect(fetched).toBeDefined();
    });
  });

  describe('clonePlan', () => {
    it('should clone system plan to tenant with sessions and exercises', async () => {
      // Create a system plan with a session and exercise
      const systemPlan = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: null,
        name: 'System Plan to Clone',
        is_system_template: 1,
      });

      // Create an exercise dictionary entry (needed for FK)
      const exercise = await vitestInvoke<any>('test_createExercise', {
        tenant_id: null,
        name: 'Squat',
        movement_category: 'squat',
        exercise_type: 'dynamic',
      });

      // Create a session
      const session = await vitestInvoke<any>('test_createTrainingSession', {
        tenant_id: null,
        plan_id: systemPlan.id,
        session_name: 'Day 1',
        week_number: 1,
      });

      // Create an exercise in the session
      await vitestInvoke('test_createSessionExercise', {
        tenant_id: null,
        session_id: session.id,
        exercise_dictionary_id: exercise.id,
        order_in_session: 1,
        target_sets: 3,
        target_reps: '10',
      });

      // Clone to Tenant A
      const cloned = await vitestInvoke<any>('test_tp_clonePlan', {
        tenant_id: TEST_TENANT_A,
        plan_id: systemPlan.id,
      });

      expect(cloned).toBeDefined();
      expect(cloned.tenant_id).toBe(TEST_TENANT_A);
      expect(cloned.is_system_template).toBe(0);

      // Verify the full plan has sessions and exercises
      const fullPlan = await vitestInvoke<any>('test_tp_getFullPlan', {
        tenant_id: TEST_TENANT_A,
        id: cloned.id,
      });

      expect(fullPlan.sessions).toBeDefined();
      expect(fullPlan.sessions.length).toBe(1);
      expect(fullPlan.sessions[0].session_name).toBe('Day 1');
      expect(fullPlan.sessions[0].exercises).toBeDefined();
      expect(fullPlan.sessions[0].exercises.length).toBe(1);
    });

    it('should apply custom name when provided', async () => {
      const systemPlan = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: null,
        name: 'Original Name',
        is_system_template: 1,
      });

      const cloned = await vitestInvoke<any>('test_tp_clonePlan', {
        tenant_id: TEST_TENANT_A,
        plan_id: systemPlan.id,
        new_name: 'My Custom Name',
      });

      expect(cloned.name).toBe('My Custom Name');
    });

    it('should append "(Copy)" to name by default', async () => {
      const systemPlan = await vitestInvoke<any>('test_createTrainingPlan', {
        tenant_id: null,
        name: 'Original Plan',
        is_system_template: 1,
      });

      const cloned = await vitestInvoke<any>('test_tp_clonePlan', {
        tenant_id: TEST_TENANT_A,
        plan_id: systemPlan.id,
      });

      expect(cloned.name).toBe('Original Plan (Copy)');
    });

    it('should return undefined for non-existent source plan', async () => {
      const result = await vitestInvoke<any>('test_tp_clonePlan', {
        tenant_id: TEST_TENANT_A,
        plan_id: 'non-existent-plan-id',
      });

      expect(result).toBeUndefined();
    });

    it('should reject cross-tenant clone attempts (security)', async () => {
      // Create a private plan in Tenant A (NOT a system template)
      const privatePlanA = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'Private Plan A',
      });

      // Tenant B attempts to clone Tenant A's private plan
      const result = await vitestInvoke<any>('test_tp_clonePlan', {
        tenant_id: TEST_TENANT_B,
        plan_id: privatePlanA.id,
      });

      // Should return undefined - cross-tenant access denied
      expect(result).toBeUndefined();

      // Verify no plan was created in Tenant B
      const tenantBPlans = await vitestInvoke<any[]>('test_tp_getPlansForTenant', {
        tenant_id: TEST_TENANT_B,
      });
      expect(tenantBPlans.some(p => p.name.includes('Private Plan A'))).toBe(false);
    });

    it('should allow cloning own tenant plans', async () => {
      // Create a private plan in Tenant A
      const privatePlanA = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'My Private Plan',
      });

      // Tenant A clones their own plan
      const cloned = await vitestInvoke<any>('test_tp_clonePlan', {
        tenant_id: TEST_TENANT_A,
        plan_id: privatePlanA.id,
        new_name: 'My Cloned Plan',
      });

      expect(cloned).toBeDefined();
      expect(cloned.tenant_id).toBe(TEST_TENANT_A);
      expect(cloned.name).toBe('My Cloned Plan');
    });
  });

  describe('getFullPlan', () => {
    it('should return plan with sessions and exercises', async () => {
      // Create a plan
      const plan = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'Full Plan Test',
      });

      // Create an exercise dictionary entry
      const exercise = await vitestInvoke<any>('test_createExercise', {
        tenant_id: TEST_TENANT_A,
        name: 'Bench Press',
        movement_category: 'push',
        exercise_type: 'dynamic',
      });

      // Create a session
      const session = await vitestInvoke<any>('test_createTrainingSession', {
        tenant_id: TEST_TENANT_A,
        plan_id: plan.id,
        session_name: 'Push Day',
        week_number: 1,
      });

      // Create an exercise
      await vitestInvoke('test_createSessionExercise', {
        tenant_id: TEST_TENANT_A,
        session_id: session.id,
        exercise_dictionary_id: exercise.id,
        order_in_session: 1,
        target_sets: 5,
        target_reps: '5',
      });

      const result = await vitestInvoke<any>('test_tp_getFullPlan', {
        tenant_id: TEST_TENANT_A,
        id: plan.id,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(plan.id);
      expect(result.sessions).toBeDefined();
      expect(result.sessions.length).toBe(1);
      expect(result.sessions[0].session_name).toBe('Push Day');
      expect(result.sessions[0].exercises).toBeDefined();
      expect(result.sessions[0].exercises.length).toBe(1);
      expect(result.sessions[0].exercises[0].target_sets).toBe(5);
    });

    it('should return undefined for plan from another tenant', async () => {
      const plan = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'Plan A',
      });

      const result = await vitestInvoke<any>('test_tp_getFullPlan', {
        tenant_id: TEST_TENANT_B,
        id: plan.id,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should isolate all CRUD operations between tenants', async () => {
      // Create plans in both tenants
      const planA = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_A,
        name: 'Plan A',
      });

      const planB = await vitestInvoke<any>('test_tp_createPlan', {
        tenant_id: TEST_TENANT_B,
        name: 'Plan B',
      });

      // Tenant A cannot access Tenant B's plan
      const fetchedA = await vitestInvoke<any>('test_tp_getPlan', {
        tenant_id: TEST_TENANT_A,
        id: planB.id,
      });
      expect(fetchedA).toBeUndefined();

      // Tenant B cannot access Tenant A's plan
      const fetchedB = await vitestInvoke<any>('test_tp_getPlan', {
        tenant_id: TEST_TENANT_B,
        id: planA.id,
      });
      expect(fetchedB).toBeUndefined();

      // Tenant A cannot update Tenant B's plan
      const updatedA = await vitestInvoke<any>('test_tp_updatePlan', {
        tenant_id: TEST_TENANT_A,
        id: planB.id,
        name: 'Hacked',
      });
      expect(updatedA).toBeUndefined();

      // Tenant A cannot delete Tenant B's plan
      const deletedA = await vitestInvoke<boolean>('test_tp_deletePlan', {
        tenant_id: TEST_TENANT_A,
        id: planB.id,
      });
      expect(deletedA).toBe(false);

      // Verify plan B still exists
      const verifyB = await vitestInvoke<any>('test_tp_getPlan', {
        tenant_id: TEST_TENANT_B,
        id: planB.id,
      });
      expect(verifyB).toBeDefined();
      expect(verifyB.name).toBe('Plan B');
    });
  });
});
