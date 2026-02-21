import { describe, it, expect, vi } from 'vitest';
import { wellnessRouter } from '../../../src/trpc/routers/wellnessRouter';
import type { Kysely } from 'kysely';
import type { Database } from '../../../src/db/schema';

const mockRecords = [
  { id: '1', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-19', rhr: 55, hrv_rmssd: 45, sleep_score: 4, fatigue_score: 2, muscle_soreness_score: 3, stress_score: 3, mood_score: 4, diet_score: 4, created_at: '2026-02-19T00:00:00.000Z', updated_at: '2026-02-19T00:00:00.000Z' },
  { id: '2', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-20', rhr: 54, hrv_rmssd: 47, sleep_score: 5, fatigue_score: 1, muscle_soreness_score: 2, stress_score: 2, mood_score: 5, diet_score: 5, created_at: '2026-02-20T00:00:00.000Z', updated_at: '2026-02-20T00:00:00.000Z' },
];

const mockDb = {
  insertInto: vi.fn(() => ({
    values: vi.fn(() => ({
      returningAll: vi.fn(() => ({
        executeTakeFirst: vi.fn(async () => ({
          id: 'test-id',
          tenant_id: 'tenant-1',
          user_id: 'user-1',
          date: '2026-02-21',
          rhr: 55,
          hrv_rmssd: 45,
          sleep_score: null,
          fatigue_score: null,
          muscle_soreness_score: null,
          stress_score: null,
          mood_score: null,
          diet_score: null,
        })),
      })),
    })),
  })),
  updateTable: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returningAll: vi.fn(() => ({
          executeTakeFirst: vi.fn(async () => ({
            id: 'test-id',
            tenant_id: 'tenant-1',
            user_id: 'user-1',
            date: '2026-02-21',
            rhr: 55,
            hrv_rmssd: 45,
            sleep_score: null,
            fatigue_score: null,
            muscle_soreness_score: null,
            stress_score: null,
            mood_score: null,
            diet_score: null,
          })),
        })),
      })),
    })),
  })),
  selectFrom: vi.fn(() => ({
    where: vi.fn(() => ({
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          selectAll: vi.fn(() => ({
            executeTakeFirst: vi.fn(async () => ({
              id: 'test-id',
              tenant_id: 'tenant-1',
              user_id: 'user-1',
              date: '2026-02-21',
              rhr: 55,
              hrv_rmssd: 45,
              sleep_score: null,
              fatigue_score: null,
              muscle_soreness_score: null,
              stress_score: null,
              mood_score: null,
              diet_score: null,
            })),
            execute: vi.fn(async () => mockRecords),
          })),
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

const createCaller = (ctx: any) => wellnessRouter.createCaller(ctx);

describe('wellnessRouter', () => {
  describe('logDailyMetrics', () => {
    it('should create a wellness record for authenticated user', async () => {
      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.logDailyMetrics({
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45,
      });

      expect(result).toBeDefined();
      expect(result!.rhr).toBe(55);
    });

    it('should create a wellness record with subjective scores', async () => {
      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.logDailyMetrics({
        date: '2026-02-21',
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
      expect(result!.rhr).toBe(55);
    });

    it('should throw UNAUTHORIZED for unauthenticated user', async () => {
      const ctx = {
        session: null,
        tenantId: null,
        userId: null,
        db: mockDb,
      };

      const caller = createCaller(ctx);
      
      await expect(caller.logDailyMetrics({
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45,
      })).rejects.toThrow('You must be logged in');
    });
  });

  describe('getMetricsByDate', () => {
    it('should fetch wellness record for authenticated user', async () => {
      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.getMetricsByDate({ date: '2026-02-21' });

      expect(result).toBeDefined();
      expect(result?.rhr).toBe(55);
    });
  });

  describe('getMetricsByDateRange', () => {
    it('should fetch wellness records within date range for authenticated user', async () => {
      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.getMetricsByDateRange({
        start_date: '2026-02-19',
        end_date: '2026-02-20',
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].rhr).toBe(55);
    });
  });
});
