import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TEST_TENANT = 'tenant-wellness-test';
const TEST_USER = 'user-wellness-test';

describe('DailyWellness Service - Integration Tests', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TEST_TENANT);
  });

  describe('calculateHrvRatio (Pure Function)', () => {
    it('should calculate HRV/RHR ratio correctly', async () => {
      // Create a wellness record and verify the ratio is calculated
      const result = await vitestInvoke<any>('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45
      });

      expect(result).toBeDefined();
      expect(result.rhr).toBe(55);
      expect(result.hrv_rmssd).toBe(45);
      expect(result.hrv_ratio).toBeCloseTo(0.818, 2);
    });

    it('should return 0 when RHR is 0 (edge case)', async () => {
      const result = await vitestInvoke<any>('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 0,
        hrv_rmssd: 45
      });

      expect(result).toBeDefined();
      expect(result.hrv_ratio).toBe(0);
    });
  });

  describe('createDailyWellness', () => {
    it('should create a daily wellness record with required fields', async () => {
      const input = {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45
      };

      const result = await vitestInvoke<any>('test_createDailyWellness', input);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.tenant_id).toBe(TEST_TENANT);
      expect(result.user_id).toBe(TEST_USER);
      expect(result.date).toBe('2026-02-21');
      expect(result.rhr).toBe(55);
      expect(result.hrv_rmssd).toBe(45);
      expect(result.hrv_ratio).toBeCloseTo(0.818, 2);
      expect(result.data_source).toBe('manual_slider');
    });

    it('should create record with optional scores', async () => {
      const result = await vitestInvoke<any>('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45,
        sleep_score: 5,
        fatigue_score: 3,
        muscle_soreness_score: 2,
        stress_score: 4,
        mood_score: 5,
        diet_score: 4
      });

      expect(result.sleep_score).toBe(5);
      expect(result.fatigue_score).toBe(3);
      expect(result.muscle_soreness_score).toBe(2);
      expect(result.stress_score).toBe(4);
      expect(result.mood_score).toBe(5);
      expect(result.diet_score).toBe(4);
    });

    it('should prevent duplicate entries for same tenant/user/date', async () => {
      const input = {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45
      };

      await vitestInvoke('test_createDailyWellness', input);

      // Attempt to create duplicate should fail
      await expect(
        vitestInvoke('test_createDailyWellness', input)
      ).rejects.toThrow();
    });
  });

  describe('createDailyWellnessViaAgent', () => {
    it('should create wellness entry with agent_voice data source', async () => {
      const result = await vitestInvoke<any>('test_createDailyWellnessViaAgent', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 52,
        hrv_rmssd: 50
      });

      expect(result).toBeDefined();
      expect(result.data_source).toBe('agent_voice');
      expect(result.rhr).toBe(52);
      expect(result.hrv_rmssd).toBe(50);
    });
  });

  describe('updateDailyWellness', () => {
    it('should update existing wellness record', async () => {
      const created = await vitestInvoke<any>('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45
      });

      const updated = await vitestInvoke<any>('test_updateDailyWellness', {
        id: created.id,
        tenant_id: TEST_TENANT,
        rhr: 52,
        hrv_rmssd: 48,
        sleep_score: 5
      });

      expect(updated).toBeDefined();
      expect(updated.rhr).toBe(52);
      expect(updated.hrv_rmssd).toBe(48);
      expect(updated.sleep_score).toBe(5);
      expect(updated.hrv_ratio).toBeCloseTo(48 / 52, 2);
    });

    it('should only update provided fields', async () => {
      const created = await vitestInvoke<any>('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45,
        sleep_score: 4
      });

      const updated = await vitestInvoke<any>('test_updateDailyWellness', {
        id: created.id,
        tenant_id: TEST_TENANT,
        rhr: 52
      });

      expect(updated.rhr).toBe(52);
      expect(updated.hrv_rmssd).toBe(45); // Unchanged
      expect(updated.sleep_score).toBe(4); // Unchanged
    });
  });

  describe('updateDailyWellnessViaAgent', () => {
    it('should update record and set data_source to agent_voice', async () => {
      const created = await vitestInvoke<any>('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45
      });

      const updated = await vitestInvoke<any>('test_updateDailyWellnessViaAgent', {
        id: created.id,
        tenant_id: TEST_TENANT,
        rhr: 52
      });

      expect(updated.data_source).toBe('agent_voice');
      expect(updated.rhr).toBe(52);
    });
  });

  describe('getDailyWellnessByDate', () => {
    it('should fetch wellness record by tenant, user, and date', async () => {
      await vitestInvoke('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45
      });

      const result = await vitestInvoke<any>('test_getDailyWellnessByDate', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21'
      });

      expect(result).toBeDefined();
      expect(result.rhr).toBe(55);
      expect(result.hrv_rmssd).toBe(45);
      expect(result.hrv_ratio).toBeCloseTo(0.818, 2);
    });

    it('should return null when record not found', async () => {
      const result = await vitestInvoke<any>('test_getDailyWellnessByDate', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21'
      });

      expect(result).toBeUndefined();
    });
  });

  describe('getDailyWellnessByDateRange', () => {
    it('should return wellness records within date range', async () => {
      await vitestInvoke('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-19',
        rhr: 55,
        hrv_rmssd: 45
      });

      await vitestInvoke('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-20',
        rhr: 54,
        hrv_rmssd: 47
      });

      await vitestInvoke('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 53,
        hrv_rmssd: 50
      });

      const result = await vitestInvoke<any[]>('test_getDailyWellnessByDateRange', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        start_date: '2026-02-19',
        end_date: '2026-02-21'
      });

      expect(result).toHaveLength(3);
      expect(result[0].hrv_ratio).toBeCloseTo(45 / 55);
      expect(result[1].hrv_ratio).toBeCloseTo(47 / 54);
      expect(result[2].hrv_ratio).toBeCloseTo(50 / 53);
    });

    it('should return empty array when no records in range', async () => {
      const result = await vitestInvoke<any[]>('test_getDailyWellnessByDateRange', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        start_date: '2026-02-01',
        end_date: '2026-02-07'
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('getMostRecentWellness', () => {
    it('should return the most recent wellness entry', async () => {
      await vitestInvoke('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-19',
        rhr: 55,
        hrv_rmssd: 45
      });

      await vitestInvoke('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 53,
        hrv_rmssd: 50
      });

      await vitestInvoke('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-20',
        rhr: 54,
        hrv_rmssd: 47
      });

      const result = await vitestInvoke<any>('test_getMostRecentWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER
      });

      expect(result).toBeDefined();
      expect(result.date).toBe('2026-02-21');
      expect(result.rhr).toBe(53);
    });

    it('should return undefined when no records exist', async () => {
      const result = await vitestInvoke<any>('test_getMostRecentWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER
      });

      expect(result).toBeUndefined();
    });
  });

  describe('getAverageWellnessScores', () => {
    it('should calculate average scores across date range', async () => {
      await vitestInvoke('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-19',
        rhr: 55,
        hrv_rmssd: 45,
        sleep_score: 5,
        fatigue_score: 3
      });

      await vitestInvoke('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-20',
        rhr: 54,
        hrv_rmssd: 47,
        sleep_score: 3,
        fatigue_score: 5
      });

      const result = await vitestInvoke<any>('test_getAverageWellnessScores', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        start_date: '2026-02-19',
        end_date: '2026-02-20'
      });

      expect(result.entry_count).toBe(2);
      expect(result.avg_rhr).toBeCloseTo(54.5);
      expect(result.avg_hrv_rmssd).toBeCloseTo(46);
      expect(result.avg_sleep_score).toBe(4);
      expect(result.avg_fatigue_score).toBe(4);
    });

    it('should return null averages for missing optional scores', async () => {
      await vitestInvoke('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-19',
        rhr: 55,
        hrv_rmssd: 45
      });

      const result = await vitestInvoke<any>('test_getAverageWellnessScores', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        start_date: '2026-02-19',
        end_date: '2026-02-19'
      });

      expect(result.entry_count).toBe(1);
      expect(result.avg_sleep_score).toBeNull();
      expect(result.avg_fatigue_score).toBeNull();
    });
  });

  describe('deleteDailyWellness', () => {
    it('should delete wellness record by id', async () => {
      const created = await vitestInvoke<any>('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45
      });

      const deleted = await vitestInvoke<any>('test_deleteDailyWellness', {
        id: created.id,
        tenant_id: TEST_TENANT
      });

      expect(deleted).toBe(true);

      const result = await vitestInvoke<any>('test_getDailyWellnessByDate', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21'
      });

      expect(result).toBeUndefined();
    });

    it('should return false when record not found', async () => {
      const deleted = await vitestInvoke<any>('test_deleteDailyWellness', {
        id: 'non-existent-id',
        tenant_id: TEST_TENANT
      });

      expect(deleted).toBe(false);
    });
  });

  describe('deleteDailyWellnessByDate', () => {
    it('should delete wellness record by date', async () => {
      await vitestInvoke('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45
      });

      const deleted = await vitestInvoke<any>('test_deleteDailyWellnessByDate', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21'
      });

      expect(deleted).toBe(true);

      const result = await vitestInvoke<any>('test_getDailyWellnessByDate', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21'
      });

      expect(result).toBeUndefined();
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should enforce tenant isolation on reads', async () => {
      const OTHER_TENANT = 'tenant-other';

      await vitestInvoke('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45
      });

      // Try to read from different tenant
      const result = await vitestInvoke<any>('test_getDailyWellnessByDate', {
        tenant_id: OTHER_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21'
      });

      expect(result).toBeUndefined();
    });

    it('should enforce tenant isolation on updates', async () => {
      const OTHER_TENANT = 'tenant-other';

      const created = await vitestInvoke<any>('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45
      });

      // Try to update from different tenant
      const updated = await vitestInvoke<any>('test_updateDailyWellness', {
        id: created.id,
        tenant_id: OTHER_TENANT,
        rhr: 52
      });

      expect(updated).toBeUndefined();

      // Verify original is unchanged
      const original = await vitestInvoke<any>('test_getDailyWellnessByDate', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-02-21'
      });

      expect(original.rhr).toBe(55);
    });
  });
});
