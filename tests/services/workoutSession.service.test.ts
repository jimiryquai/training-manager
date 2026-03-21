import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TEST_TENANT = 'tenant-workout-test';
const TEST_USER = 'user-workout-test';

describe('WorkoutSession Service - Integration Tests', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TEST_TENANT);
  });

  describe('calculateTrainingLoad (Pure Function)', () => {
    it('should calculate training load as duration * sRPE', async () => {
      const result = await vitestInvoke<any>('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7
      });

      expect(result).toBeDefined();
      expect(result.training_load).toBe(420);
    });

    it('should handle zero duration', async () => {
      const result = await vitestInvoke<any>('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 0,
        srpe: 7
      });

      expect(result.training_load).toBe(0);
    });

    it('should handle minimum sRPE', async () => {
      const result = await vitestInvoke<any>('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 30,
        srpe: 1
      });

      expect(result.training_load).toBe(30);
    });

    it('should handle maximum sRPE', async () => {
      const result = await vitestInvoke<any>('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 30,
        srpe: 10
      });

      expect(result.training_load).toBe(300);
    });
  });

  describe('createWorkoutSession', () => {
    it('should create session with auto-calculated training load', async () => {
      const input = {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7
      };

      const result = await vitestInvoke<any>('test_createWorkoutSession', input);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.tenant_id).toBe(TEST_TENANT);
      expect(result.user_id).toBe(TEST_USER);
      expect(result.date).toBe('2026-02-21');
      expect(result.duration_minutes).toBe(60);
      expect(result.srpe).toBe(7);
      expect(result.training_load).toBe(420);
      expect(result.is_voice_entry).toBe(0);
      expect(result.completed_as_planned).toBe(1);
    });

    it('should create session with optional fields', async () => {
      const result = await vitestInvoke<any>('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7,
        planned_session_id: 'plan-123',
        completed_as_planned: 0,
        is_voice_entry: 1
      });

      expect(result.planned_session_id).toBe('plan-123');
      expect(result.completed_as_planned).toBe(0);
      expect(result.is_voice_entry).toBe(1);
    });
  });

  describe('createWorkoutSessionViaAgent', () => {
    it('should create workout session with voice entry flag and agent log', async () => {
      const result = await vitestInvoke<any>('test_createWorkoutSessionViaAgent', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7,
        agent_reasoning: 'User reported a moderate strength session via voice'
      });

      expect(result).toBeDefined();
      expect(result.is_voice_entry).toBe(1);
      expect(result.agent_interaction_log).toBeDefined();
      expect(result.agent_interaction_log).toContain('create_workout_session');
      expect(result.agent_interaction_log).toContain('moderate strength session');
      expect(result.training_load).toBe(420);
    });

    it('should include original input in agent log', async () => {
      const result = await vitestInvoke<any>('test_createWorkoutSessionViaAgent', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 45,
        srpe: 6,
        planned_session_id: 'plan-456',
        agent_reasoning: 'Voice entry for planned session'
      });

      const log = JSON.parse(result.agent_interaction_log);
      expect(log.action).toBe('create_workout_session');
      expect(log.reasoning).toBe('Voice entry for planned session');
      expect(log.original_input.duration_minutes).toBe(45);
      expect(log.original_input.srpe).toBe(6);
      expect(log.original_input.planned_session_id).toBe('plan-456');
    });
  });

  describe('updateWorkoutSession', () => {
    it('should update session duration and recalculate training load', async () => {
      const created = await vitestInvoke<any>('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7
      });

      const updated = await vitestInvoke<any>('test_updateWorkoutSession', {
        id: created.id,
        tenant_id: TEST_TENANT,
        duration_minutes: 90
      });

      expect(updated.duration_minutes).toBe(90);
      expect(updated.srpe).toBe(7);
      expect(updated.training_load).toBe(630); // 90 * 7
    });

    it('should update sRPE and recalculate training load', async () => {
      const created = await vitestInvoke<any>('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7
      });

      const updated = await vitestInvoke<any>('test_updateWorkoutSession', {
        id: created.id,
        tenant_id: TEST_TENANT,
        srpe: 8
      });

      expect(updated.duration_minutes).toBe(60);
      expect(updated.srpe).toBe(8);
      expect(updated.training_load).toBe(480); // 60 * 8
    });

    it('should update both duration and sRPE together', async () => {
      const created = await vitestInvoke<any>('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7
      });

      const updated = await vitestInvoke<any>('test_updateWorkoutSession', {
        id: created.id,
        tenant_id: TEST_TENANT,
        duration_minutes: 45,
        srpe: 9
      });

      expect(updated.training_load).toBe(405); // 45 * 9
    });

    it('should update completed_as_planned flag', async () => {
      const created = await vitestInvoke<any>('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7
      });

      const updated = await vitestInvoke<any>('test_updateWorkoutSession', {
        id: created.id,
        tenant_id: TEST_TENANT,
        completed_as_planned: 0
      });

      expect(updated.completed_as_planned).toBe(0);
      expect(updated.training_load).toBe(420); // Unchanged
    });

    it('should return undefined when session not found', async () => {
      const result = await vitestInvoke<any>('test_updateWorkoutSession', {
        id: 'non-existent-id',
        tenant_id: TEST_TENANT,
        duration_minutes: 90
      });

      expect(result).toBeUndefined();
    });
  });

  describe('markWorkoutAsVoiceEntry', () => {
    it('should mark existing workout as voice entry and append to log', async () => {
      const created = await vitestInvoke<any>('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7
      });

      expect(created.is_voice_entry).toBe(0);
      expect(created.agent_interaction_log).toBeNull();

      const updated = await vitestInvoke<any>('test_markWorkoutAsVoiceEntry', {
        id: created.id,
        tenant_id: TEST_TENANT,
        agent_reasoning: 'User corrected duration via voice',
        modifications: { duration_minutes: 60, original_duration: 45 }
      });

      expect(updated.is_voice_entry).toBe(1);
      expect(updated.agent_interaction_log).toBeDefined();
      
      const log = JSON.parse(updated.agent_interaction_log);
      expect(log.action).toBe('modify_workout_session');
      expect(log.reasoning).toBe('User corrected duration via voice');
      expect(log.modifications.duration_minutes).toBe(60);
      expect(log.previous_values.duration_minutes).toBe(60);
    });

    it('should return undefined when session not found', async () => {
      const result = await vitestInvoke<any>('test_markWorkoutAsVoiceEntry', {
        id: 'non-existent-id',
        tenant_id: TEST_TENANT,
        agent_reasoning: 'Test',
        modifications: {}
      });

      expect(result).toBeUndefined();
    });
  });

  describe('getWorkoutSessionById', () => {
    it('should fetch session by id', async () => {
      const created = await vitestInvoke<any>('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7
      });

      const result = await vitestInvoke<any>('test_getWorkoutSessionById', {
        id: created.id,
        tenant_id: TEST_TENANT
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.training_load).toBe(420);
    });

    it('should return undefined when not found', async () => {
      const result = await vitestInvoke<any>('test_getWorkoutSessionById', {
        id: 'non-existent-id',
        tenant_id: TEST_TENANT
      });

      expect(result).toBeUndefined();
    });
  });

  describe('getWorkoutSessionsByDateRange', () => {
    it('should fetch sessions within date range for tenant', async () => {
      await vitestInvoke('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-19',
        duration_minutes: 60,
        srpe: 7
      });

      await vitestInvoke('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-20',
        duration_minutes: 45,
        srpe: 6
      });

      await vitestInvoke('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 30,
        srpe: 8
      });

      const result = await vitestInvoke<any[]>('test_getWorkoutSessionsByDateRange', {
        tenant_id: TEST_TENANT,
        start_date: '2026-02-01',
        end_date: '2026-02-28'
      });

      expect(result).toHaveLength(3);
      expect(result[0].training_load).toBe(420);
      expect(result[1].training_load).toBe(270);
      expect(result[2].training_load).toBe(240);
    });

    it('should filter by user_id when provided', async () => {
      const OTHER_USER = 'user-other';

      await vitestInvoke('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7
      });

      await vitestInvoke('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: OTHER_USER,
        date: '2026-02-21',
        duration_minutes: 45,
        srpe: 6
      });

      const result = await vitestInvoke<any[]>('test_getWorkoutSessionsByDateRange', {
        tenant_id: TEST_TENANT,
        start_date: '2026-02-01',
        end_date: '2026-02-28',
        user_id: TEST_USER
      });

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe(TEST_USER);
    });

    it('should return empty array when no sessions found', async () => {
      const result = await vitestInvoke<any[]>('test_getWorkoutSessionsByDateRange', {
        tenant_id: TEST_TENANT,
        start_date: '2026-02-01',
        end_date: '2026-02-28'
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteWorkoutSession', () => {
    it('should delete session by id', async () => {
      const created = await vitestInvoke<any>('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7
      });

      const deleted = await vitestInvoke<any>('test_deleteWorkoutSession', {
        id: created.id,
        tenant_id: TEST_TENANT
      });

      expect(deleted).toBe(true);

      const result = await vitestInvoke<any>('test_getWorkoutSessionById', {
        id: created.id,
        tenant_id: TEST_TENANT
      });

      expect(result).toBeUndefined();
    });

    it('should return false when session not found', async () => {
      const deleted = await vitestInvoke<any>('test_deleteWorkoutSession', {
        id: 'non-existent-id',
        tenant_id: TEST_TENANT
      });

      expect(deleted).toBe(false);
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should enforce tenant isolation on reads', async () => {
      const OTHER_TENANT = 'tenant-other';

      await vitestInvoke('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7
      });

      const result = await vitestInvoke<any[]>('test_getWorkoutSessionsByDateRange', {
        tenant_id: OTHER_TENANT,
        start_date: '2026-02-01',
        end_date: '2026-02-28'
      });

      expect(result).toHaveLength(0);
    });

    it('should enforce tenant isolation on updates', async () => {
      const OTHER_TENANT = 'tenant-other';

      const created = await vitestInvoke<any>('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7
      });

      const updated = await vitestInvoke<any>('test_updateWorkoutSession', {
        id: created.id,
        tenant_id: OTHER_TENANT,
        duration_minutes: 90
      });

      expect(updated).toBeUndefined();

      const original = await vitestInvoke<any>('test_getWorkoutSessionById', {
        id: created.id,
        tenant_id: TEST_TENANT
      });

      expect(original.duration_minutes).toBe(60);
    });

    it('should enforce tenant isolation on deletes', async () => {
      const OTHER_TENANT = 'tenant-other';

      const created = await vitestInvoke<any>('test_createWorkoutSession', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7
      });

      const deleted = await vitestInvoke<any>('test_deleteWorkoutSession', {
        id: created.id,
        tenant_id: OTHER_TENANT
      });

      expect(deleted).toBe(false);

      const result = await vitestInvoke<any>('test_getWorkoutSessionById', {
        id: created.id,
        tenant_id: TEST_TENANT
      });

      expect(result).toBeDefined();
    });
  });

  describe('Agent Voice-to-DB Pipeline Integration', () => {
    it('should support full voice entry workflow', async () => {
      // Step 1: AI Agent creates workout session via voice
      const created = await vitestInvoke<any>('test_createWorkoutSessionViaAgent', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        duration_minutes: 60,
        srpe: 7,
        agent_reasoning: 'User reported moderate strength session'
      });

      expect(created.is_voice_entry).toBe(1);
      expect(created.training_load).toBe(420);

      // Step 2: User later corrects via voice
      const updated = await vitestInvoke<any>('test_markWorkoutAsVoiceEntry', {
        id: created.id,
        tenant_id: TEST_TENANT,
        agent_reasoning: 'User corrected duration',
        modifications: { duration_minutes: 75 }
      });

      expect(updated.is_voice_entry).toBe(1);
      expect(updated.agent_interaction_log).toContain('create_workout_session');
      expect(updated.agent_interaction_log).toContain('modify_workout_session');

      // Step 3: Verify agent logs are preserved
      const final = await vitestInvoke<any>('test_getWorkoutSessionById', {
        id: created.id,
        tenant_id: TEST_TENANT
      });

      expect(final.agent_interaction_log).toBeDefined();
      expect(final.is_voice_entry).toBe(1);
    });
  });
});
