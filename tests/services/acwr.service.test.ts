import { describe, it, expect, beforeEach } from 'vitest';
import { calculateAcuteLoad, calculateChronicLoad, isDangerZone } from '../../src/services/acwr.service';
import { vitestInvoke } from 'rwsdk-community/test';
import type { CreateWorkoutSessionInput } from '../../src/services/workoutSession.service';

const TEST_TENANT = 'tenant-test';

describe('ACWR Service', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TEST_TENANT);
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
      // 28 days of 100 load = 2800. Averaged over 4 weeks: 2800 / 4 = 700
      expect(result).toBe(700);
    });

    it('should handle sparse data (missing days)', () => {
      const sessions = [
        { date: '2026-02-21', training_load: 2800 },
      ];
      const result = calculateChronicLoad(sessions, '2026-02-21');
      // 28 days total: sum = 2800. Averaged over 4 weeks: 2800 / 4 = 700
      expect(result).toBe(700);
    });
  });

  describe('calculateACWR Integration', () => {
    async function setupSessions(sessions: Partial<CreateWorkoutSessionInput>[]) {
      for (const s of sessions) {
        await vitestInvoke('test_createWorkoutSession', {
          tenant_id: TEST_TENANT,
          user_id: 'user-1',
          modality: 'strength',
          duration_minutes: 60,
          srpe: 7, // Load = 420 by default unless duration/srpe overridden
          date: '2026-02-21',
          ...s
        });
      }
    }

    it('should return correct ratio and danger flag based on real database records', async () => {
      // Acute session (last 7 days). Load = 70 * 10 = 700
      await setupSessions([{ date: '2026-02-21', duration_minutes: 70, srpe: 10 }]);
      // Chronic session (8-28 days ago). Load = 280 * 10 = 2800
      await setupSessions([{ date: '2026-02-01', duration_minutes: 280, srpe: 10 }]);

      const result = await vitestInvoke<any>('test_calculateACWR', {
        tenant_id: TEST_TENANT,
        date: '2026-02-21'
      });

      // Acute load = sum of past 7 days = 700
      expect(result.acute_load).toBe(700);
      expect(result.chronic_load).toBe((2800 + 700) / 4); // Both are in the 28 day window
      const expectedRatio = 700 / ((2800 + 700) / 4);
      expect(result.ratio).toBeCloseTo(expectedRatio, 2);
      expect(result.isDanger).toBe(expectedRatio > 1.5);
    });

    it('should return ratio of 0 when chronic load is 0', async () => {
      const result = await vitestInvoke<any>('test_calculateACWR', {
        tenant_id: TEST_TENANT,
        date: '2026-02-21'
      });

      expect(result.ratio).toBe(0);
      expect(result.isDanger).toBe(false);
      expect(result.acute_load).toBe(0);
      expect(result.chronic_load).toBe(0);
    });

    it('should verify ratio > 1.5 triggers danger', async () => {
      // Very high acute load
      await setupSessions([{ date: '2026-02-21', duration_minutes: 400, srpe: 10 }]); // Load = 4000
      // Low chronic past load
      await setupSessions([{ date: '2026-02-01', duration_minutes: 10, srpe: 10 }]); // Load = 100

      const result = await vitestInvoke<any>('test_calculateACWR', {
        tenant_id: TEST_TENANT,
        date: '2026-02-21'
      });

      // Acute = 4000
      // Chronic = (4000 + 100) / 4 = 1025
      // Ratio = 4000 / 1025 = 3.9
      expect(result.acute_load).toBe(4000);
      expect(result.chronic_load).toBe(1025);
      expect(result.ratio).toBeGreaterThan(1.5);
      expect(result.isDanger).toBe(true);
    });
  });
});
