import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TEST_TENANT = 'tenant-training-test';
const TEST_TENANT_B = 'tenant-training-test-b';

describe('trainingRouter - Integration Tests', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TEST_TENANT);
    await vitestInvoke('test_cleanDatabase', TEST_TENANT_B);

    // Create user first - required for FK constraint
    await vitestInvoke('test_createUser', {
      id: 'training-test-user',
      email: 'training-test@example.com',
      tenant_id: TEST_TENANT,
    });
  });

  describe('logSession', () => {
    it('should create a workout session with required fields', async () => {
      const result = await vitestInvoke<any>('test_tr_logSession', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        duration_minutes: 60,
        srpe: 7,
      });

      expect(result).toBeDefined();
      expect(result.tenant_id).toBe(TEST_TENANT);
      expect(result.date).toBe('2026-04-03');
      expect(result.duration_minutes).toBe(60);
      expect(result.srpe).toBe(7);
      expect(result.training_load).toBe(420); // 60 * 7
    });

    it('should create a workout session with optional fields', async () => {
      const result = await vitestInvoke<any>('test_tr_logSession', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        duration_minutes: 45,
        srpe: 5,
        completed_as_planned: true,
      });

      expect(result).toBeDefined();
      expect(result.completed_as_planned).toBe(1);
    });

    it('should calculate load as duration * srpe', async () => {
      const result = await vitestInvoke<any>('test_tr_logSession', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        duration_minutes: 30,
        srpe: 8,
      });

      expect(result.training_load).toBe(240); // 30 * 8
    });
  });

  describe('updateSession', () => {
    it('should update session fields', async () => {
      const created = await vitestInvoke<any>('test_tr_logSession', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        duration_minutes: 60,
        srpe: 7,
      });

      const updated = await vitestInvoke<any>('test_tr_updateSession', {
        tenant_id: TEST_TENANT,
        id: created.id,
        duration_minutes: 90,
        srpe: 8,
      });

      expect(updated.duration_minutes).toBe(90);
      expect(updated.srpe).toBe(8);
      expect(updated.training_load).toBe(720); // 90 * 8
    });

    it('should partially update session fields', async () => {
      const created = await vitestInvoke<any>('test_tr_logSession', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        duration_minutes: 60,
        srpe: 7,
      });

      const updated = await vitestInvoke<any>('test_tr_updateSession', {
        tenant_id: TEST_TENANT,
        id: created.id,
        srpe: 9,
      });

      expect(updated.duration_minutes).toBe(60); // unchanged
      expect(updated.srpe).toBe(9);
      expect(updated.training_load).toBe(540); // 60 * 9
    });
  });

  describe('getSession', () => {
    it('should retrieve a session by ID', async () => {
      const created = await vitestInvoke<any>('test_tr_logSession', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        duration_minutes: 60,
        srpe: 7,
      });

      const result = await vitestInvoke<any>('test_tr_getSession', {
        tenant_id: TEST_TENANT,
        id: created.id,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.date).toBe('2026-04-03');
    });

    it('should return undefined for non-existent session', async () => {
      const result = await vitestInvoke<any>('test_tr_getSession', {
        tenant_id: TEST_TENANT,
        id: 'non-existent-id',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('getSessionsByDateRange', () => {
    it('should return sessions within date range', async () => {
      await vitestInvoke('test_tr_logSession', {
        tenant_id: TEST_TENANT,
        date: '2026-04-01',
        duration_minutes: 60,
        srpe: 7,
      });

      await vitestInvoke('test_tr_logSession', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        duration_minutes: 45,
        srpe: 6,
      });

      await vitestInvoke('test_tr_logSession', {
        tenant_id: TEST_TENANT,
        date: '2026-04-05',
        duration_minutes: 30,
        srpe: 8,
      });

      const result = await vitestInvoke<any[]>('test_tr_getSessionsByDateRange', {
        tenant_id: TEST_TENANT,
        start_date: '2026-04-01',
        end_date: '2026-04-03',
      });

      expect(result.length).toBe(2);
      const dates = result.map(r => r.date).sort();
      expect(dates).toEqual(['2026-04-01', '2026-04-03']);
    });

    it('should return empty array for range with no sessions', async () => {
      const result = await vitestInvoke<any[]>('test_tr_getSessionsByDateRange', {
        tenant_id: TEST_TENANT,
        start_date: '2026-01-01',
        end_date: '2026-01-07',
      });

      expect(result).toEqual([]);
    });
  });

  describe('getACWRStatus', () => {
    it('should return ACWR calculation for the date', async () => {
      // Create sessions spread over time for ACWR calculation
      for (let i = 0; i < 7; i++) {
        const date = new Date('2026-04-03');
        date.setDate(date.getDate() - i);
        await vitestInvoke('test_tr_logSession', {
          tenant_id: TEST_TENANT,
          date: date.toISOString().split('T')[0],
          duration_minutes: 60,
          srpe: 7,
        });
      }

      const result = await vitestInvoke<any>('test_tr_getACWRStatus', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
      });

      expect(result).toBeDefined();
      expect(result.acute_load).toBeDefined();
      expect(result.chronic_load).toBeDefined();
      expect(result.ratio).toBeDefined();
    });
  });

  describe('logSessionViaAgent', () => {
    it('should create session with agent metadata', async () => {
      const result = await vitestInvoke<any>('test_tr_logSessionViaAgent', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        duration_minutes: 60,
        srpe: 7,
        agent_reasoning: 'User said they did a hard 1-hour workout',
      });

      expect(result).toBeDefined();
      expect(result.is_voice_entry).toBe(1);
      expect(result.agent_interaction_log).toContain('User said they did a hard 1-hour workout');
      expect(result.training_load).toBe(420);
    });

    it('should include completed_as_planned when provided', async () => {
      const result = await vitestInvoke<any>('test_tr_logSessionViaAgent', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        duration_minutes: 60,
        srpe: 7,
        agent_reasoning: 'Completed as planned',
        completed_as_planned: true,
      });

      expect(result.completed_as_planned).toBe(1);
    });
  });

  describe('markAsVoiceEntry', () => {
    it('should mark existing session as voice entry with modifications', async () => {
      const created = await vitestInvoke<any>('test_tr_logSession', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        duration_minutes: 60,
        srpe: 7,
      });

      const result = await vitestInvoke<any>('test_tr_markAsVoiceEntry', {
        tenant_id: TEST_TENANT,
        id: created.id,
        agent_reasoning: 'User corrected duration via voice',
        modifications: {
          original_duration: 60,
          corrected_duration: 75,
        },
      });

      expect(result).toBeDefined();
      expect(result.is_voice_entry).toBe(1);
      expect(result.agent_interaction_log).toContain('User corrected duration via voice');
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should not retrieve sessions from another tenant', async () => {
      const created = await vitestInvoke<any>('test_tr_logSession', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        duration_minutes: 60,
        srpe: 7,
      });

      // Create user for tenant B
      await vitestInvoke('test_createUser', {
        id: 'training-test-user-b',
        email: 'training-test-b@example.com',
        tenant_id: TEST_TENANT_B,
      });

      // Query from tenant B should not find tenant A's session
      const result = await vitestInvoke<any>('test_tr_getSession', {
        tenant_id: TEST_TENANT_B,
        id: created.id,
      });

      expect(result).toBeUndefined();
    });

    it('should not update sessions from another tenant', async () => {
      const created = await vitestInvoke<any>('test_tr_logSession', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        duration_minutes: 60,
        srpe: 7,
      });

      // Create user for tenant B
      await vitestInvoke('test_createUser', {
        id: 'training-test-user-b',
        email: 'training-test-b@example.com',
        tenant_id: TEST_TENANT_B,
      });

      // Try to update from tenant B - should not affect the record
      const result = await vitestInvoke<any>('test_tr_updateSession', {
        tenant_id: TEST_TENANT_B,
        id: created.id,
        srpe: 10,
      });

      // Should return undefined (no rows updated)
      expect(result).toBeUndefined();

      // Verify original is unchanged
      const verify = await vitestInvoke<any>('test_tr_getSession', {
        tenant_id: TEST_TENANT,
        id: created.id,
      });
      expect(verify.srpe).toBe(7);
    });

    it('should isolate date range queries by tenant', async () => {
      await vitestInvoke('test_tr_logSession', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        duration_minutes: 60,
        srpe: 7,
      });

      // Create user for tenant B
      await vitestInvoke('test_createUser', {
        id: 'training-test-user-b',
        email: 'training-test-b@example.com',
        tenant_id: TEST_TENANT_B,
      });

      // Query from tenant B should return empty
      const result = await vitestInvoke<any[]>('test_tr_getSessionsByDateRange', {
        tenant_id: TEST_TENANT_B,
        start_date: '2026-04-01',
        end_date: '2026-04-05',
      });

      expect(result).toEqual([]);
    });
  });
});
