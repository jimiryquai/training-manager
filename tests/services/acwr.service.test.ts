import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateACWR, calculateAcuteLoad, calculateChronicLoad, isDangerZone } from '../../src/services/acwr.service';
import * as workoutSessionService from '../../src/services/workoutSession.service';
import type { Kysely } from 'kysely';
import type { Database } from '../../src/db/schema';

vi.mock('../../src/services/workoutSession.service');

describe('ACWR Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isDangerZone', () => {
    it('should return true when ratio exceeds 1.5', () => {
      expect(isDangerZone(1.6)).toBe(true);
    });

    it('should return false when ratio is at or below 1.5', () => {
      expect(isDangerZone(1.5)).toBe(false);
      expect(isDangerZone(1.2)).toBe(false);
    });
  });

  describe('calculateAcuteLoad', () => {
    it('should return 7-day sum of training loads', () => {
      const sessions = [
        { date: '2026-02-21', training_load: 100 },
        { date: '2026-02-20', training_load: 150 },
        { date: '2026-02-19', training_load: 200 },
        { date: '2026-02-18', training_load: 100 },
        { date: '2026-02-17', training_load: 50 },
        { date: '2026-02-16', training_load: 100 },
        { date: '2026-02-15', training_load: 200 },
      ];
      const result = calculateAcuteLoad(sessions, '2026-02-21');
      expect(result).toBe(900);
    });

    it('should only count sessions within 7-day window', () => {
      const sessions = [
        { date: '2026-02-21', training_load: 100 },
        { date: '2026-02-14', training_load: 500 },
      ];
      const result = calculateAcuteLoad(sessions, '2026-02-21');
      expect(result).toBe(100);
    });
  });

  describe('calculateChronicLoad', () => {
    it('should return 28-day average of training loads', () => {
      const sessions: Array<{ date: string; training_load: number }> = [];
      const refDate = new Date('2026-02-21');
      for (let i = 0; i < 28; i++) {
        const d = new Date(refDate);
        d.setDate(d.getDate() - i);
        sessions.push({
          date: d.toISOString().split('T')[0],
          training_load: 100
        });
      }
      const result = calculateChronicLoad(sessions, '2026-02-21');
      expect(result).toBe(100);
    });

    it('should handle sparse data (missing days)', () => {
      const sessions = [
        { date: '2026-02-21', training_load: 2800 },
      ];
      const result = calculateChronicLoad(sessions, '2026-02-21');
      expect(result).toBe(100);
    });
  });

  describe('calculateACWR', () => {
    it('should return correct ratio and danger flag', async () => {
      vi.mocked(workoutSessionService.getWorkoutSessionsByDateRange)
        .mockResolvedValueOnce([
          { id: '1', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-21', modality: 'strength', duration_minutes: 60, srpe: 7, training_load: 700 }
        ] as any)
        .mockResolvedValueOnce([
          { id: '1', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-21', modality: 'strength', duration_minutes: 60, srpe: 7, training_load: 2800 }
        ] as any);

      const mockDb = {} as Kysely<Database>;

      const result = await calculateACWR(mockDb, {
        tenant_id: 'tenant-1',
        date: '2026-02-21'
      });

      expect(result.ratio).toBeCloseTo(7, 2);
      expect(result.isDanger).toBe(true);
      expect(result.acute_load).toBe(700);
      expect(result.chronic_load).toBe(100);
    });

    it('should return ratio of 0 when chronic load is 0', async () => {
      vi.mocked(workoutSessionService.getWorkoutSessionsByDateRange)
        .mockResolvedValueOnce([
          { id: '1', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-21', modality: 'strength', duration_minutes: 60, srpe: 7, training_load: 100 }
        ] as any)
        .mockResolvedValueOnce([]);

      const mockDb = {} as Kysely<Database>;

      const result = await calculateACWR(mockDb, {
        tenant_id: 'tenant-1',
        date: '2026-02-21'
      });

      expect(result.ratio).toBe(0);
      expect(result.isDanger).toBe(false);
    });

    it('should detect danger zone when ratio exceeds 1.5', async () => {
      vi.mocked(workoutSessionService.getWorkoutSessionsByDateRange)
        .mockResolvedValueOnce([
          { id: '1', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-21', modality: 'strength', duration_minutes: 60, srpe: 7, training_load: 1600 }
        ] as any)
        .mockResolvedValueOnce([
          { id: '1', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-21', modality: 'strength', duration_minutes: 60, srpe: 7, training_load: 2800 }
        ] as any);

      const mockDb = {} as Kysely<Database>;

      const result = await calculateACWR(mockDb, {
        tenant_id: 'tenant-1',
        date: '2026-02-21'
      });

      expect(result.ratio).toBeCloseTo(16, 0);
      expect(result.isDanger).toBe(true);
    });
  });
});
