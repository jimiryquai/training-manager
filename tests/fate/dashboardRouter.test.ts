import { describe, it, expect, vi } from 'vitest';
import { dashboardRouter } from '../../src/fate/dashboardRouter';
import type { Kysely } from 'kysely';
import type { Database } from '../../src/db/schema';

const mockWellnessRecords = [
  { id: '1', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-21', rhr: 55, hrv_rmssd: 45, created_at: '2026-02-21T00:00:00.000Z', updated_at: '2026-02-21T00:00:00.000Z' },
];

const mockWorkoutRecords: unknown[] = [];

const mockDb = {
  selectFrom: vi.fn(() => ({
    where: vi.fn(() => ({
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            selectAll: vi.fn(() => ({
              execute: vi.fn(async () => mockWellnessRecords),
              executeTakeFirst: vi.fn(async () => mockWellnessRecords[0]),
            })),
          })),
        })),
      })),
    })),
  })),
  insertInto: vi.fn(),
} as unknown as Kysely<Database>;

const createCaller = (ctx: any) => dashboardRouter.createCaller(ctx);

describe('dashboardRouter', () => {
  describe('getReadinessView', () => {
    it('should return composed readiness data for authenticated user', async () => {
      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.getReadinessView({
        date: '2026-02-21',
        history_days: 28,
      });

      expect(result).toBeDefined();
      expect(result.acwr).toBeDefined();
      expect(result.wellnessHistory).toBeDefined();
    });

    it('should throw UNAUTHORIZED for unauthenticated user', async () => {
      const ctx = {
        session: null,
        tenantId: null,
        userId: null,
        db: mockDb,
      };

      const caller = createCaller(ctx);

      await expect(caller.getReadinessView({
        date: '2026-02-21',
        history_days: 28,
      })).rejects.toThrow('You must be logged in');
    });
  });
});
