import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TEST_TENANT = 'tenant-upsert-test';
const TEST_USER = 'user-upsert-test';

describe('Upsert Operations - Integration Tests', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TEST_TENANT);
  });

  describe('upsertDailyWellness', () => {
    it('should create new record when none exists', async () => {
      const result = await vitestInvoke<any>('test_upsertDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-03-15',
        rhr: 55,
        hrv_rmssd: 45,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.tenant_id).toBe(TEST_TENANT);
      expect(result.user_id).toBe(TEST_USER);
      expect(result.date).toBe('2026-03-15');
      expect(result.rhr).toBe(55);
      expect(result.hrv_rmssd).toBe(45);
      expect(result.hrv_ratio).toBeCloseTo(45 / 55, 2);
    });

    it('should update existing record when one matches on (tenant_id, user_id, date)', async () => {
      // First upsert: creates the record
      const created = await vitestInvoke<any>('test_upsertDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-03-15',
        rhr: 55,
        hrv_rmssd: 45,
        sleep_score: 4,
      });

      expect(created).toBeDefined();
      const originalId = created.id;

      // Second upsert: should update, not create a new record
      const updated = await vitestInvoke<any>('test_upsertDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-03-15',
        rhr: 50,
        hrv_rmssd: 40,
        fatigue_score: 3,
      });

      expect(updated).toBeDefined();
      // The record should have the same ID (it was updated, not duplicated)
      expect(updated.id).toBe(originalId);
      expect(updated.rhr).toBe(50);
      expect(updated.hrv_rmssd).toBe(40);
      // Updated fields
      expect(updated.fatigue_score).toBe(3);
      // hrv_ratio should be recalculated
      expect(updated.hrv_ratio).toBeCloseTo(40 / 50, 2);

      // Verify there's only one record for this date
      const fetched = await vitestInvoke<any>('test_getDailyWellnessByDate', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-03-15',
      });

      expect(fetched).toBeDefined();
      expect(fetched.rhr).toBe(50);
    });

    it('should return correct hrv_ratio after upsert', async () => {
      // Create with initial values
      await vitestInvoke<any>('test_upsertDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-03-15',
        rhr: 60,
        hrv_rmssd: 30,
      });

      // Upsert with different values
      const result = await vitestInvoke<any>('test_upsertDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-03-15',
        rhr: 50,
        hrv_rmssd: 50,
      });

      // hrv_ratio = hrv_rmssd / rhr = 50 / 50 = 1.0
      expect(result.hrv_ratio).toBeCloseTo(1.0, 2);
    });

    it('should handle zero RHR edge case in upsert', async () => {
      const result = await vitestInvoke<any>('test_upsertDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-03-15',
        rhr: 0,
        hrv_rmssd: 45,
      });

      expect(result).toBeDefined();
      expect(result.hrv_ratio).toBe(0);
    });

    it('should maintain tenant isolation across upserts', async () => {
      const OTHER_TENANT = 'tenant-upsert-other';

      // Upsert for Tenant X
      await vitestInvoke<any>('test_upsertDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-03-15',
        rhr: 55,
        hrv_rmssd: 45,
      });

      // Upsert same date for Tenant Y
      const resultY = await vitestInvoke<any>('test_upsertDailyWellness', {
        tenant_id: OTHER_TENANT,
        user_id: TEST_USER,
        date: '2026-03-15',
        rhr: 60,
        hrv_rmssd: 50,
      });

      expect(resultY).toBeDefined();
      expect(resultY.tenant_id).toBe(OTHER_TENANT);
      expect(resultY.rhr).toBe(60);

      // Verify Tenant X record is unchanged
      const resultX = await vitestInvoke<any>('test_getDailyWellnessByDate', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-03-15',
      });

      expect(resultX).toBeDefined();
      expect(resultX.rhr).toBe(55);
      expect(resultX.hrv_rmssd).toBe(45);
    });

    it('should allow sequential upserts without duplication', async () => {
      // Perform 3 sequential upserts on the same key
      const r1 = await vitestInvoke<any>('test_upsertDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-03-15',
        rhr: 60,
        hrv_rmssd: 30,
      });
      expect(r1.rhr).toBe(60);

      const r2 = await vitestInvoke<any>('test_upsertDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-03-15',
        rhr: 55,
        hrv_rmssd: 40,
      });
      expect(r2.rhr).toBe(55);
      expect(r2.id).toBe(r1.id); // Same record updated

      const r3 = await vitestInvoke<any>('test_upsertDailyWellness', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        date: '2026-03-15',
        rhr: 50,
        hrv_rmssd: 50,
      });
      expect(r3.rhr).toBe(50);
      expect(r3.id).toBe(r1.id); // Still the same record
    });
  });
});
