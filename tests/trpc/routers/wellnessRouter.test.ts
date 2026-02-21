import { describe, it, expect, vi } from 'vitest';
import { wellnessRouter } from '../../../src/trpc/routers/wellnessRouter';
import type { Kysely } from 'kysely';
import type { Database } from '../../../src/db/schema';

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
      expect(result.rhr).toBe(55);
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
});
