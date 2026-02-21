import { describe, it, expect } from 'vitest';
import { createWorkoutSession, calculateTrainingLoad, getWorkoutSessionsByDateRange } from '../../src/services/workoutSession.service';
import type { Kysely } from 'kysely';
import type { Database } from '../../src/db/schema';

const mockDb = {
  insertInto: () => ({
    values: () => ({
      returningAll: () => ({
        executeTakeFirst: async () => ({
          id: 'test-id',
          tenant_id: 'tenant-1',
          user_id: 'user-1',
          date: '2026-02-21',
          modality: 'strength',
          duration_minutes: 60,
          srpe: 7,
          training_load: 420
        })
      })
    })
  })
} as unknown as Kysely<Database>;

const mockDbWithSelect = {
  ...mockDb,
  selectFrom: () => ({
    where: () => ({
      where: () => ({
        where: () => ({
          selectAll: () => ({
            execute: async () => [
              { id: '1', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-19', modality: 'strength', duration_minutes: 60, srpe: 7, training_load: 420 },
              { id: '2', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-20', modality: 'running', duration_minutes: 45, srpe: 6, training_load: 270 }
            ]
          })
        })
      })
    })
  })
} as unknown as Kysely<Database>;

describe('WorkoutSession Service', () => {
  describe('calculateTrainingLoad', () => {
    it('should calculate training load as duration * sRPE', () => {
      const result = calculateTrainingLoad(60, 7);
      expect(result).toBe(420);
    });

    it('should handle zero duration', () => {
      const result = calculateTrainingLoad(0, 7);
      expect(result).toBe(0);
    });

    it('should handle minimum sRPE', () => {
      const result = calculateTrainingLoad(30, 1);
      expect(result).toBe(30);
    });

    it('should handle maximum sRPE', () => {
      const result = calculateTrainingLoad(30, 10);
      expect(result).toBe(300);
    });
  });

  describe('createWorkoutSession', () => {
    it('should create session with auto-calculated training load', async () => {
      const input = {
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        date: '2026-02-21',
        modality: 'strength' as const,
        duration_minutes: 60,
        srpe: 7
      };

      const result = await createWorkoutSession(mockDb, input);
      expect(result).toBeDefined();
      expect(result?.training_load).toBe(420);
    });
  });

  describe('getWorkoutSessionsByDateRange', () => {
    it('should fetch sessions within date range for tenant', async () => {
      const result = await getWorkoutSessionsByDateRange(mockDbWithSelect, {
        tenant_id: 'tenant-1',
        start_date: '2026-02-01',
        end_date: '2026-02-28'
      });
      expect(result).toHaveLength(2);
      expect(result[0].training_load).toBe(420);
    });

    it('should return empty array when no sessions found', async () => {
      const mockDbEmpty = {
        selectFrom: () => ({
          where: () => ({
            where: () => ({
              where: () => ({
                selectAll: () => ({
                  execute: async () => []
                })
              })
            })
          })
        })
      } as unknown as Kysely<Database>;

      const result = await getWorkoutSessionsByDateRange(mockDbEmpty, {
        tenant_id: 'tenant-1',
        start_date: '2026-02-01',
        end_date: '2026-02-28'
      });
      expect(result).toHaveLength(0);
    });
  });
});
