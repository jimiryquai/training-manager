import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TEST_TENANT = 'tenant-dashboard-test';
const TEST_TENANT_B = 'tenant-dashboard-test-b';
const TEST_USER = 'training-test-user'; // Must match TRAINING_TEST_USER in test-utils.ts

describe('dashboardRouter - Integration Tests', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TEST_TENANT);
    await vitestInvoke('test_cleanDatabase', TEST_TENANT_B);

    // Create user first - required for FK constraint
    await vitestInvoke('test_createUser', {
      id: TEST_USER,
      email: 'dashboard-test@example.com',
      tenant_id: TEST_TENANT,
    });
  });

  describe('getReadinessView', () => {
    it('should return composed readiness data for authenticated user', async () => {
      // Create some workout sessions for ACWR calculation
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

      // Create some wellness data
      await vitestInvoke('test_w_logDailyMetrics', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        rhr: 55,
        hrv_rmssd: 45,
        sleep_score: 4,
      });

      const result = await vitestInvoke<any>('test_dash_getReadinessView', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        history_days: 7,
      });

      expect(result).toBeDefined();
      // ACWR data should be present
      expect(result.acwr).toBeDefined();
      // Wellness history should be present
      expect(result.wellnessHistory).toBeDefined();
      // ACWR history should be present
      expect(result.acwrHistory).toBeDefined();
    });

    it('should return empty arrays when no data exists', async () => {
      const result = await vitestInvoke<any>('test_dash_getReadinessView', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        history_days: 7,
      });

      expect(result).toBeDefined();
      // Should have default ACWR values when no sessions exist
      expect(result.acwr).toBeDefined();
      expect(result.acwr.acute_load).toBe(0);
      expect(result.acwr.chronic_load).toBe(0);
      expect(result.acwr.ratio).toBe(0);
      // Should return empty arrays for history
      expect(result.wellnessHistory).toEqual([]);
      expect(result.acwrHistory).toBeDefined();
    });

    it('should return correct ACWR history for the specified date range', async () => {
      // Create sessions for 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date('2026-04-07');
        date.setDate(date.getDate() - i);
        await vitestInvoke('test_tr_logSession', {
          tenant_id: TEST_TENANT,
          date: date.toISOString().split('T')[0],
          duration_minutes: 60,
          srpe: 7,
        });
      }

      const result = await vitestInvoke<any>('test_dash_getReadinessView', {
        tenant_id: TEST_TENANT,
        date: '2026-04-07',
        history_days: 7,
      });

      expect(result).toBeDefined();
      expect(result.acwrHistory).toBeDefined();
      // Should have history points for each day
      expect(result.acwrHistory.length).toBe(7);
    });

    it('should include wellness metrics in history', async () => {
      // Use direct service call with correct user_id (TRAINING_TEST_USER)
      await vitestInvoke('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-04-01',
        rhr: 55,
        hrv_rmssd: 45,
      });

      await vitestInvoke('test_createDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-04-02',
        rhr: 54,
        hrv_rmssd: 47,
      });

      const result = await vitestInvoke<any>('test_dash_getReadinessView', {
        tenant_id: TEST_TENANT,
        date: '2026-04-02',
        history_days: 7,
      });

      expect(result).toBeDefined();
      // Should have at least the 2 days of wellness data we created
      expect(result.wellnessHistory.length).toBeGreaterThanOrEqual(2);
      const dates = result.wellnessHistory.map((w: any) => w.date).sort();
      expect(dates).toContain('2026-04-01');
      expect(dates).toContain('2026-04-02');
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should not return data from another tenant', async () => {
      // Create session in tenant A
      await vitestInvoke('test_tr_logSession', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        duration_minutes: 60,
        srpe: 7,
      });

      // Create wellness in tenant A
      await vitestInvoke('test_w_logDailyMetrics', {
        tenant_id: TEST_TENANT,
        date: '2026-04-03',
        rhr: 55,
        hrv_rmssd: 45,
      });

      // Create user for tenant B
      await vitestInvoke('test_createUser', {
        id: 'training-test-user-b',
        email: 'dashboard-test-b@example.com',
        tenant_id: TEST_TENANT_B,
      });

      // Query from tenant B should return empty data
      const result = await vitestInvoke<any>('test_dash_getReadinessView', {
        tenant_id: TEST_TENANT_B,
        date: '2026-04-03',
        history_days: 7,
      });

      expect(result).toBeDefined();
      expect(result.acwr.acute_load).toBe(0);
      expect(result.acwr.chronic_load).toBe(0);
      expect(result.wellnessHistory).toEqual([]);
    });
  });
});
