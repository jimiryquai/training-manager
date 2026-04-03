import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TENANT_A = 'tenant-session-a';
const TENANT_B = 'tenant-session-b';

describe('trainingSessionRouter - Integration Tests', () => {
  let planA: { id: string };
  let planB: { id: string };
  let exerciseDict: { id: string };

  beforeEach(async () => {
    // Clean both tenants
    await vitestInvoke('test_cleanDatabase', TENANT_A);
    await vitestInvoke('test_cleanDatabase', TENANT_B);
    await vitestInvoke('test_cleanTrainingPlanData', TENANT_A);
    await vitestInvoke('test_cleanTrainingPlanData', TENANT_B);

    // Create parent plans for each tenant
    planA = await vitestInvoke<{ id: string }>('test_createTrainingPlan', {
      tenant_id: TENANT_A,
      name: 'Plan A',
    });

    planB = await vitestInvoke<{ id: string }>('test_createTrainingPlan', {
      tenant_id: TENANT_B,
      name: 'Plan B',
    });

    // Create exercise dictionary entry (system-wide, tenant_id = null)
    exerciseDict = await vitestInvoke<{ id: string }>('test_createExercise', {
      tenant_id: null,
      name: 'Bench Press',
      movement_category: 'horizontal_push',
      exercise_type: 'dynamic',
    });
  });

  // ===========================================================================
  // Session CRUD
  // ===========================================================================

  describe('createSession', () => {
    it('should create session under a plan for authenticated tenant', async () => {
      const session = await vitestInvoke<any>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        session_name: 'Upper Body',
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.plan_id).toBe(planA.id);
      expect(session.tenant_id).toBe(TENANT_A);
      expect(session.session_name).toBe('Upper Body');
    });

    it('should set optional fields when provided', async () => {
      const session = await vitestInvoke<any>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        block_name: 'Block 1',
        week_number: 3,
        day_of_week: 'Monday',
        session_name: 'Push Day',
      });

      expect(session.block_name).toBe('Block 1');
      expect(session.week_number).toBe(3);
      expect(session.day_of_week).toBe('Monday');
      expect(session.session_name).toBe('Push Day');
    });
  });

  describe('getSession', () => {
    it('should return session by id for correct tenant', async () => {
      const created = await vitestInvoke<any>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        session_name: 'Lower Body',
      });

      const found = await vitestInvoke<any>('test_ts_getSession', {
        tenant_id: TENANT_A,
        id: created.id,
      });

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.session_name).toBe('Lower Body');
    });

    it('should return undefined for session from another tenant', async () => {
      const created = await vitestInvoke<any>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        session_name: 'Tenant A Session',
      });

      const found = await vitestInvoke<any>('test_ts_getSession', {
        tenant_id: TENANT_B,
        id: created.id,
      });

      expect(found).toBeUndefined();
    });
  });

  describe('getSessionsByPlan', () => {
    it('should return all sessions for a plan', async () => {
      await vitestInvoke('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        session_name: 'Session 1',
      });
      await vitestInvoke('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        session_name: 'Session 2',
      });

      const sessions = await vitestInvoke<any[]>('test_ts_getSessionsByPlan', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
      });

      expect(sessions).toHaveLength(2);
      const names = sessions.map((s) => s.session_name);
      expect(names).toContain('Session 1');
      expect(names).toContain('Session 2');
    });

    it('should not include sessions from other tenants plans', async () => {
      await vitestInvoke('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        session_name: 'A Session',
      });
      await vitestInvoke('test_ts_createSession', {
        tenant_id: TENANT_B,
        plan_id: planB.id,
        session_name: 'B Session',
      });

      const sessionsA = await vitestInvoke<any[]>('test_ts_getSessionsByPlan', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
      });
      expect(sessionsA).toHaveLength(1);
      expect(sessionsA[0].session_name).toBe('A Session');

      const sessionsB = await vitestInvoke<any[]>('test_ts_getSessionsByPlan', {
        tenant_id: TENANT_B,
        plan_id: planB.id,
      });
      expect(sessionsB).toHaveLength(1);
      expect(sessionsB[0].session_name).toBe('B Session');
    });
  });

  describe('getSessionsByWeek', () => {
    it('should filter sessions by week_number', async () => {
      await vitestInvoke('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        week_number: 1,
        session_name: 'Week 1 Session',
      });
      await vitestInvoke('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        week_number: 2,
        session_name: 'Week 2 Session',
      });

      const week1 = await vitestInvoke<any[]>('test_ts_getSessionsByWeek', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        week_number: 1,
      });

      expect(week1).toHaveLength(1);
      expect(week1[0].session_name).toBe('Week 1 Session');
    });

    it('should return empty for non-existent week', async () => {
      await vitestInvoke('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        week_number: 1,
      });

      const week5 = await vitestInvoke<any[]>('test_ts_getSessionsByWeek', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        week_number: 5,
      });

      expect(week5).toHaveLength(0);
    });
  });

  describe('updateSession', () => {
    it('should update session fields', async () => {
      const created = await vitestInvoke<any>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        session_name: 'Original Name',
      });

      const updated = await vitestInvoke<any>('test_ts_updateSession', {
        tenant_id: TENANT_A,
        id: created.id,
        session_name: 'Updated Name',
        week_number: 4,
      });

      expect(updated).toBeDefined();
      expect(updated.session_name).toBe('Updated Name');
      expect(updated.week_number).toBe(4);
    });

    it('should return undefined for session from another tenant', async () => {
      const created = await vitestInvoke<any>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        session_name: 'Tenant A Only',
      });

      const updated = await vitestInvoke<any>('test_ts_updateSession', {
        tenant_id: TENANT_B,
        id: created.id,
        session_name: 'Hijacked',
      });

      expect(updated).toBeUndefined();
    });
  });

  describe('deleteSession', () => {
    it('should delete session and return truthy', async () => {
      const created = await vitestInvoke<any>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
      });

      const deleted = await vitestInvoke<boolean>('test_ts_deleteSession', {
        tenant_id: TENANT_A,
        id: created.id,
      });

      expect(deleted).toBe(true);

      const found = await vitestInvoke<any>('test_ts_getSession', {
        tenant_id: TENANT_A,
        id: created.id,
      });
      expect(found).toBeUndefined();
    });

    it('should cascade delete child exercises', async () => {
      const session = await vitestInvoke<any>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
      });

      const exercise = await vitestInvoke<any>('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: session.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 1,
      });

      // Delete the session
      await vitestInvoke('test_ts_deleteSession', {
        tenant_id: TENANT_A,
        id: session.id,
      });

      // Exercise should be gone (cascade delete)
      const found = await vitestInvoke<any>('test_ts_getExercise', {
        tenant_id: TENANT_A,
        id: exercise.id,
      });
      expect(found).toBeUndefined();
    });
  });

  describe('getFullSession', () => {
    it('should return session with exercises populated', async () => {
      const session = await vitestInvoke<any>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        session_name: 'Full Session',
      });

      await vitestInvoke('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: session.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 1,
      });

      const full = await vitestInvoke<any>('test_ts_getFullSession', {
        tenant_id: TENANT_A,
        id: session.id,
      });

      expect(full).toBeDefined();
      expect(full.id).toBe(session.id);
      expect(full.exercises).toHaveLength(1);
      expect(full.exercises[0].exercise_dictionary_id).toBe(exerciseDict.id);
    });

    it('should return undefined for non-existent session', async () => {
      const full = await vitestInvoke<any>('test_ts_getFullSession', {
        tenant_id: TENANT_A,
        id: 'non-existent-id',
      });

      expect(full).toBeUndefined();
    });
  });

  // ===========================================================================
  // Exercise CRUD
  // ===========================================================================

  describe('createExercise', () => {
    let sessionA: { id: string };

    beforeEach(async () => {
      sessionA = await vitestInvoke<{ id: string }>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
      });
    });

    it('should create exercise in session for authenticated tenant', async () => {
      const exercise = await vitestInvoke<any>('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 1,
      });

      expect(exercise).toBeDefined();
      expect(exercise.id).toBeDefined();
      expect(exercise.session_id).toBe(sessionA.id);
      expect(exercise.tenant_id).toBe(TENANT_A);
      expect(exercise.order_in_session).toBe(1);
    });

    it('should set order_in_session correctly', async () => {
      const ex1 = await vitestInvoke<any>('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 1,
      });
      const ex2 = await vitestInvoke<any>('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 2,
      });

      expect(ex1.order_in_session).toBe(1);
      expect(ex2.order_in_session).toBe(2);
    });
  });

  describe('getExercise', () => {
    let sessionA: { id: string };
    let exerciseA: { id: string };

    beforeEach(async () => {
      sessionA = await vitestInvoke<{ id: string }>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
      });
      exerciseA = await vitestInvoke<{ id: string }>('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 1,
      });
    });

    it('should return exercise by id for correct tenant', async () => {
      const found = await vitestInvoke<any>('test_ts_getExercise', {
        tenant_id: TENANT_A,
        id: exerciseA.id,
      });

      expect(found).toBeDefined();
      expect(found.id).toBe(exerciseA.id);
    });

    it('should return undefined for exercise from another tenant', async () => {
      const found = await vitestInvoke<any>('test_ts_getExercise', {
        tenant_id: TENANT_B,
        id: exerciseA.id,
      });

      expect(found).toBeUndefined();
    });
  });

  describe('getExercisesBySession', () => {
    let sessionA: { id: string };

    beforeEach(async () => {
      sessionA = await vitestInvoke<{ id: string }>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
      });
    });

    it('should return all exercises for a session', async () => {
      await vitestInvoke('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 1,
      });
      await vitestInvoke('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 2,
      });

      const exercises = await vitestInvoke<any[]>('test_ts_getExercisesBySession', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
      });

      expect(exercises).toHaveLength(2);
    });

    it('should return empty for session with no exercises', async () => {
      const exercises = await vitestInvoke<any[]>('test_ts_getExercisesBySession', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
      });

      expect(exercises).toHaveLength(0);
    });
  });

  describe('getExercisesGrouped', () => {
    let sessionA: { id: string };

    beforeEach(async () => {
      sessionA = await vitestInvoke<{ id: string }>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
      });
    });

    it('should return exercises grouped by circuit_group', async () => {
      await vitestInvoke('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 1,
        circuit_group: 'A',
      });
      await vitestInvoke('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 2,
        circuit_group: 'A',
      });

      const grouped = await vitestInvoke<Record<string, any[]>>('test_ts_getExercisesGrouped', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
      });

      expect(grouped['A']).toBeDefined();
      expect(grouped['A']).toHaveLength(2);
    });

    it('should use ungrouped key for null circuit_group', async () => {
      await vitestInvoke('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 1,
        // no circuit_group
      });

      const grouped = await vitestInvoke<Record<string, any[]>>('test_ts_getExercisesGrouped', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
      });

      expect(grouped['ungrouped']).toBeDefined();
      expect(grouped['ungrouped']).toHaveLength(1);
    });

    it('should handle multiple circuit groups', async () => {
      await vitestInvoke('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 1,
        circuit_group: 'A',
      });
      await vitestInvoke('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 2,
        circuit_group: 'B',
      });
      await vitestInvoke('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 3,
        // ungrouped
      });

      const grouped = await vitestInvoke<Record<string, any[]>>('test_ts_getExercisesGrouped', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
      });

      expect(Object.keys(grouped).sort()).toEqual(['A', 'B', 'ungrouped']);
      expect(grouped['A']).toHaveLength(1);
      expect(grouped['B']).toHaveLength(1);
      expect(grouped['ungrouped']).toHaveLength(1);
    });
  });

  describe('updateExercise', () => {
    let sessionA: { id: string };
    let exerciseA: { id: string };

    beforeEach(async () => {
      sessionA = await vitestInvoke<{ id: string }>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
      });
      exerciseA = await vitestInvoke<{ id: string }>('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 1,
      });
    });

    it('should update exercise fields', async () => {
      const updated = await vitestInvoke<any>('test_ts_updateExercise', {
        tenant_id: TENANT_A,
        id: exerciseA.id,
        order_in_session: 5,
        scheme_name: '5x5',
        coach_notes: 'Keep back straight',
      });

      expect(updated).toBeDefined();
      expect(updated.order_in_session).toBe(5);
      expect(updated.scheme_name).toBe('5x5');
      expect(updated.coach_notes).toBe('Keep back straight');
    });

    it('should return undefined for exercise from another tenant', async () => {
      const updated = await vitestInvoke<any>('test_ts_updateExercise', {
        tenant_id: TENANT_B,
        id: exerciseA.id,
        order_in_session: 10,
      });

      expect(updated).toBeUndefined();
    });
  });

  describe('deleteExercise', () => {
    let sessionA: { id: string };
    let exerciseA: { id: string };

    beforeEach(async () => {
      sessionA = await vitestInvoke<{ id: string }>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
      });
      exerciseA = await vitestInvoke<{ id: string }>('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 1,
      });
    });

    it('should delete exercise and return truthy', async () => {
      const deleted = await vitestInvoke<boolean>('test_ts_deleteExercise', {
        tenant_id: TENANT_A,
        id: exerciseA.id,
      });

      expect(deleted).toBe(true);

      const found = await vitestInvoke<any>('test_ts_getExercise', {
        tenant_id: TENANT_A,
        id: exerciseA.id,
      });
      expect(found).toBeUndefined();
    });

    it('should return false for exercise from another tenant', async () => {
      const deleted = await vitestInvoke<boolean>('test_ts_deleteExercise', {
        tenant_id: TENANT_B,
        id: exerciseA.id,
      });

      expect(deleted).toBe(false);

      // Original should still exist
      const found = await vitestInvoke<any>('test_ts_getExercise', {
        tenant_id: TENANT_A,
        id: exerciseA.id,
      });
      expect(found).toBeDefined();
    });
  });

  // ===========================================================================
  // Multi-tenant Isolation (Router Level)
  // ===========================================================================

  describe('Multi-tenant isolation (router level)', () => {
    it('should not access sessions from another tenant', async () => {
      const sessionA = await vitestInvoke<any>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
        session_name: 'Secret A Session',
      });

      // Try to get with wrong tenant
      const found = await vitestInvoke<any>('test_ts_getSession', {
        tenant_id: TENANT_B,
        id: sessionA.id,
      });
      expect(found).toBeUndefined();

      // Try to update with wrong tenant
      const updated = await vitestInvoke<any>('test_ts_updateSession', {
        tenant_id: TENANT_B,
        id: sessionA.id,
        session_name: 'Hijacked',
      });
      expect(updated).toBeUndefined();
    });

    it('should not access exercises from another tenant', async () => {
      const sessionA = await vitestInvoke<any>('test_ts_createSession', {
        tenant_id: TENANT_A,
        plan_id: planA.id,
      });

      const exerciseA = await vitestInvoke<any>('test_ts_createExercise', {
        tenant_id: TENANT_A,
        session_id: sessionA.id,
        exercise_dictionary_id: exerciseDict.id,
        order_in_session: 1,
        coach_notes: 'Secret notes',
      });

      // Try to get with wrong tenant
      const found = await vitestInvoke<any>('test_ts_getExercise', {
        tenant_id: TENANT_B,
        id: exerciseA.id,
      });
      expect(found).toBeUndefined();

      // Try to update with wrong tenant
      const updated = await vitestInvoke<any>('test_ts_updateExercise', {
        tenant_id: TENANT_B,
        id: exerciseA.id,
        coach_notes: 'Hijacked',
      });
      expect(updated).toBeUndefined();

      // Try to delete with wrong tenant
      const deleted = await vitestInvoke<boolean>('test_ts_deleteExercise', {
        tenant_id: TENANT_B,
        id: exerciseA.id,
      });
      expect(deleted).toBe(false);
    });
  });
});
