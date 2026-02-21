import { describe, it, expect, vi } from 'vitest';
import { trainingRouter } from '../../../src/trpc/routers/trainingRouter';
import type { Kysely } from 'kysely';
import type { Database } from '../../../src/db/schema';

const createMockDb = (): unknown => ({
  insertInto: vi.fn(() => ({
    values: vi.fn(() => ({
      returningAll: vi.fn(() => ({
        executeTakeFirst: vi.fn(async () => ({
          id: 'test-id',
          tenant_id: 'tenant-1',
          user_id: 'user-1',
          date: '2026-02-21',
          modality: 'strength',
          duration_minutes: 60,
          srpe: 7,
          training_load: 420,
        })),
      })),
    })),
  })),
  selectFrom: vi.fn(() => ({
    where: vi.fn(() => ({
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            selectAll: vi.fn(() => ({
              execute: vi.fn(async () => [
                { date: '2026-02-21', training_load: 420 },
                { date: '2026-02-20', training_load: 300 },
              ]),
            })),
          })),
        })),
      })),
    })),
  })),
});

const createCaller = (ctx: any) => trainingRouter.createCaller(ctx);

describe('trainingRouter', () => {
  describe('logSession', () => {
    it('should create a workout session for authenticated user', async () => {
      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: createMockDb() as Kysely<Database>,
      };

      const caller = createCaller(ctx);
      const result = await caller.logSession({
        date: '2026-02-21',
        modality: 'strength',
        duration_minutes: 60,
        srpe: 7,
      });

      expect(result).toBeDefined();
      expect(result?.training_load).toBe(420);
    });

    it('should throw UNAUTHORIZED for unauthenticated user', async () => {
      const ctx = {
        session: null,
        tenantId: null,
        userId: null,
        db: createMockDb() as Kysely<Database>,
      };

      const caller = createCaller(ctx);
      
      await expect(caller.logSession({
        date: '2026-02-21',
        modality: 'strength',
        duration_minutes: 60,
        srpe: 7,
      })).rejects.toThrow('You must be logged in');
    });
  });

  describe('getACWRStatus', () => {
    it('should return ACWR data for authenticated user', async () => {
      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: createMockDb() as Kysely<Database>,
      };

      const caller = createCaller(ctx);
      const result = await caller.getACWRStatus({ date: '2026-02-21' });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('acute_load');
      expect(result).toHaveProperty('chronic_load');
      expect(result).toHaveProperty('ratio');
      expect(result).toHaveProperty('isDanger');
      expect(typeof result.isDanger).toBe('boolean');
    });
  });
});
