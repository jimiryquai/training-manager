import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDailyWellness, calculateHrvRatio, getDailyWellnessByDate, getDailyWellnessByDateRange } from '../../src/services/dailyWellness.service';
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

    it('should return undefined when record not found', async () => {
      const mockDbNotFound = {
        selectFrom: () => ({
          where: () => ({
            where: () => ({
              where: () => ({
                selectAll: () => ({
                  executeTakeFirst: async () => undefined
                })
              })
            })
          })
        })
      } as unknown as Kysely<Database>;

      const result = await getDailyWellnessByDate(mockDbNotFound, {
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        date: '2026-02-21'
      });
      expect(result).toBeUndefined();
    });
  });

  describe('getDailyWellnessByDateRange', () => {
    it('should return wellness records within date range', async () => {
      const mockRecords = [
        { id: '1', tenant_id: 't1', user_id: 'u1', date: '2026-02-19', rhr: 55, hrv_rmssd: 45, created_at: '2026-02-19T00:00:00.000Z', updated_at: '2026-02-19T00:00:00.000Z' },
        { id: '2', tenant_id: 't1', user_id: 'u1', date: '2026-02-20', rhr: 54, hrv_rmssd: 47, created_at: '2026-02-20T00:00:00.000Z', updated_at: '2026-02-20T00:00:00.000Z' },
        { id: '3', tenant_id: 't1', user_id: 'u1', date: '2026-02-21', rhr: 53, hrv_rmssd: 50, created_at: '2026-02-21T00:00:00.000Z', updated_at: '2026-02-21T00:00:00.000Z' },
      ];

      const mockDbRange = {
        selectFrom: vi.fn(() => ({
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              where: vi.fn(() => ({
                where: vi.fn(() => ({
                  selectAll: vi.fn(() => ({
                    execute: vi.fn(async () => mockRecords),
                  })),
                })),
              })),
            })),
          })),
        })),
      } as unknown as Kysely<Database>;

      const result = await getDailyWellnessByDateRange(mockDbRange, {
        tenant_id: 't1',
        user_id: 'u1',
        start_date: '2026-02-19',
        end_date: '2026-02-21',
      });

      expect(result).toHaveLength(3);
      expect(result[0].hrv_ratio).toBeCloseTo(45 / 55);
    });
  });
});
