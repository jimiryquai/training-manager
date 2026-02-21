import { describe, it, expect, beforeEach } from 'vitest';
import { createDailyWellness, calculateHrvRatio, getDailyWellnessByDate } from '../../src/services/dailyWellness.service';
import type { Kysely } from 'kysely';
import type { Database } from '../../src/db/schema';

const mockDb = {
  insertInto: () => ({
    values: () => ({
      returningAll: () => ({
        executeTakeFirst: async () => ({ id: 'test-id', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-21', rhr: 55, hrv_rmssd: 45, hrv_ratio: 0.818, created_at: '2026-02-21T00:00:00.000Z', updated_at: '2026-02-21T00:00:00.000Z' })
      })
    })
  }),
  selectFrom: () => ({
    where: () => ({
      where: () => ({
        where: () => ({
          selectAll: () => ({
            executeTakeFirst: async () => ({
              id: 'test-id',
              tenant_id: 'tenant-1',
              user_id: 'user-1',
              date: '2026-02-21',
              rhr: 55,
              hrv_rmssd: 45,
              hrv_ratio: 0.818,
              created_at: '2026-02-21T00:00:00.000Z',
              updated_at: '2026-02-21T00:00:00.000Z'
            })
          })
        })
      })
    })
  })
} as unknown as Kysely<Database>;

describe('DailyWellness Service', () => {
  describe('calculateHrvRatio', () => {
    it('should calculate HRV/RHR ratio correctly', () => {
      const rhr = 55;
      const hrvRmssd = 45;
      const result = calculateHrvRatio(hrvRmssd, rhr);
      expect(result).toBeCloseTo(0.818, 2);
    });

    it('should return 0 when RHR is 0 (edge case)', () => {
      const result = calculateHrvRatio(45, 0);
      expect(result).toBe(0);
    });
  });

  describe('createDailyWellness', () => {
    it('should create a daily wellness record with required fields', async () => {
      const input = {
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45
      };

      const result = await createDailyWellness(mockDb, input);
      expect(result).toBeDefined();
      expect(result?.rhr).toBe(55);
      expect(result?.hrv_rmssd).toBe(45);
      expect(result?.hrv_ratio).toBeCloseTo(0.818, 2);
    });
  });

  describe('getDailyWellnessByDate', () => {
    it('should fetch wellness record by tenant, user, and date', async () => {
      const result = await getDailyWellnessByDate(mockDb, {
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        date: '2026-02-21'
      });
      expect(result).toBeDefined();
      expect(result?.rhr).toBe(55);
      expect(result?.hrv_ratio).toBeCloseTo(0.818, 2);
    });
  });
});
