import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TEST_TENANT = 'tenant-wellness-test';
const TEST_TENANT_B = 'tenant-wellness-test-b';
const TEST_USER = 'wellness-test-user';

describe('wellnessRouter - Integration Tests', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TEST_TENANT);
    await vitestInvoke('test_cleanDatabase', TEST_TENANT_B);

    // Create user first - required for FK constraint
    await vitestInvoke('test_createUser', {
      id: TEST_USER,
      email: 'wellness-test@example.com',
      tenant_id: TEST_TENANT,
    });
  });

  describe('logDailyMetrics', () => {
    it('should create a wellness record for authenticated user', async () => {
      const result = await vitestInvoke<any>('test_w_logDailyMetrics', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        rhr: 55,
        hrv_rmssd: 45,
      });

      expect(result).toBeDefined();
      expect(result.tenant_id).toBe(TEST_TENANT);
      expect(result.user_id).toBe(TEST_USER);
      expect(result.date).toBe('2026-04-03');
      expect(result.rhr).toBe(55);
      expect(result.hrv_rmssd).toBe(45);
    });

    it('should create a wellness record with all subjective scores', async () => {
      const result = await vitestInvoke<any>('test_w_logDailyMetrics', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        rhr: 55,
        hrv_rmssd: 45,
        sleep_score: 4,
        fatigue_score: 2,
        muscle_soreness_score: 3,
        stress_score: 3,
        mood_score: 4,
        diet_score: 4,
      });

      expect(result).toBeDefined();
      expect(result.sleep_score).toBe(4);
      expect(result.fatigue_score).toBe(2);
      expect(result.muscle_soreness_score).toBe(3);
      expect(result.stress_score).toBe(3);
      expect(result.mood_score).toBe(4);
      expect(result.diet_score).toBe(4);
    });

    it('should use upsert behavior (update if same date exists)', async () => {
      // First insert
      const first = await vitestInvoke<any>('test_w_logDailyMetrics', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        rhr: 55,
        hrv_rmssd: 45,
      });

      // Second insert on same date should update
      const second = await vitestInvoke<any>('test_w_logDailyMetrics', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        rhr: 60,
        hrv_rmssd: 50,
      });

      expect(second).toBeDefined();
      expect(second.date).toBe('2026-04-03');
      expect(second.rhr).toBe(60);
      expect(second.hrv_rmssd).toBe(50);
      // Same record updated (same ID)
      expect(second.id).toBe(first.id);
    });
  });

  describe('getMetricsByDate', () => {
    it('should fetch wellness record by date', async () => {
      await vitestInvoke('test_w_logDailyMetrics', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        rhr: 55,
        hrv_rmssd: 45,
        sleep_score: 4,
      });

      const result = await vitestInvoke<any>('test_w_getMetricsByDate', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
      });

      expect(result).toBeDefined();
      expect(result.date).toBe('2026-04-03');
      expect(result.rhr).toBe(55);
      expect(result.sleep_score).toBe(4);
    });

    it('should return null/undefined for non-existent date', async () => {
      const result = await vitestInvoke<any>('test_w_getMetricsByDate', {
        tenant_id: TEST_TENANT,
        date: '2026-01-01',
      });

      // Service returns undefined when not found
      expect(result).toBeUndefined();
    });
  });

  describe('getMetricsByDateRange', () => {
    it('should fetch records within date range', async () => {
      await vitestInvoke('test_w_logDailyMetrics', {
        tenant_id: TEST_TENANT,
        date: '2026-04-01',
        rhr: 55,
        hrv_rmssd: 45,
      });

      await vitestInvoke('test_w_logDailyMetrics', {
        tenant_id: TEST_TENANT,
        date: '2026-04-02',
        rhr: 54,
        hrv_rmssd: 47,
      });

      await vitestInvoke('test_w_logDailyMetrics', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        rhr: 53,
        hrv_rmssd: 49,
      });

      const result = await vitestInvoke<any[]>('test_w_getMetricsByDateRange', {
        tenant_id: TEST_TENANT,
        start_date: '2026-04-01',
        end_date: '2026-04-03',
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(3);
      const dates = result.map((r) => r.date).sort();
      expect(dates).toEqual(['2026-04-01', '2026-04-02', '2026-04-03']);
    });

    it('should return empty for range with no data', async () => {
      const result = await vitestInvoke<any[]>('test_w_getMetricsByDateRange', {
        tenant_id: TEST_TENANT,
        start_date: '2026-01-01',
        end_date: '2026-01-07',
      });

      expect(result).toEqual([]);
    });
  });

  describe('logDailyMetricsViaAgent', () => {
    it('should create wellness with data_source=agent_voice', async () => {
      const result = await vitestInvoke<any>('test_w_logDailyMetricsViaAgent', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        rhr: 58,
        hrv_rmssd: 42,
        sleep_score: 3,
      });

      expect(result).toBeDefined();
      expect(result.data_source).toBe('agent_voice');
      expect(result.sleep_score).toBe(3);
    });

    it('should default rhr and hrv_rmssd when not provided', async () => {
      const result = await vitestInvoke<any>('test_w_logDailyMetricsViaAgent', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        sleep_score: 3,
        mood_score: 4,
      });

      expect(result).toBeDefined();
      // Router defaults rhr to 50 and hrv_rmssd to 50 when not provided
      expect(result.rhr).toBe(50);
      expect(result.hrv_rmssd).toBe(50);
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should not return wellness from another tenant', async () => {
      // Create wellness in tenant A
      await vitestInvoke('test_w_logDailyMetrics', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        rhr: 55,
        hrv_rmssd: 45,
      });

      // Query from tenant B should return undefined (not found)
      const result = await vitestInvoke<any>('test_w_getMetricsByDate', {
        tenant_id: TEST_TENANT_B,
        date: '2026-04-03',
      });

      // Service returns undefined when not found
      expect(result).toBeUndefined();
    });

    it('should not update wellness from another tenant', async () => {
      // Create wellness in tenant A
      const first = await vitestInvoke<any>('test_w_logDailyMetrics', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        rhr: 55,
        hrv_rmssd: 45,
      });

      // Try to upsert same date from tenant B - should create a new record
      const second = await vitestInvoke<any>('test_w_logDailyMetrics', {
        tenant_id: TEST_TENANT_B,
        date: '2026-04-03',
        rhr: 60,
        hrv_rmssd: 50,
      });

      // Should be different records (different tenants)
      expect(second.id).not.toBe(first.id);
      expect(second.tenant_id).toBe(TEST_TENANT_B);

      // Original tenant A record should be unchanged
      const verifyA = await vitestInvoke<any>('test_w_getMetricsByDate', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
      });
      expect(verifyA.rhr).toBe(55);
    });
  });
});
