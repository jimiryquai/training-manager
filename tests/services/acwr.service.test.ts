import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateAcuteLoad,
  calculateChronicLoad,
  isDangerZone,
  isOptimalZone,
  isUnderTrainingZone
} from '../../src/services/acwr.service';
import { vitestInvoke } from 'rwsdk-community/test';
import type { CreateWorkoutSessionInput } from '../../src/services/workoutSession.service';

const TEST_TENANT = 'tenant-acwr-test';

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

  describe('Zone Classification Functions', () => {
    it('should identify danger zone (>1.5)', () => {
      expect(isDangerZone(1.6)).toBe(true);
      expect(isDangerZone(2.0)).toBe(true);
      expect(isDangerZone(1.5)).toBe(false);
      expect(isDangerZone(1.3)).toBe(false);
    });

    it('should identify optimal zone (0.8 - 1.3)', () => {
      expect(isOptimalZone(0.8)).toBe(true);
      expect(isOptimalZone(1.0)).toBe(true);
      expect(isOptimalZone(1.3)).toBe(true);
      expect(isOptimalZone(0.79)).toBe(false);
      expect(isOptimalZone(1.4)).toBe(false);
      expect(isOptimalZone(1.6)).toBe(false);
    });

    it('should identify under-training zone (<0.8)', () => {
      expect(isUnderTrainingZone(0.79)).toBe(true);
      expect(isUnderTrainingZone(0.5)).toBe(true);
      expect(isUnderTrainingZone(0.8)).toBe(false);
      expect(isUnderTrainingZone(1.0)).toBe(false);
    });
  });

  describe('calculateHistoricalACWR (CRITICAL for Chart Data)', () => {
    async function setupSessions(sessions: Partial<CreateWorkoutSessionInput>[]) {
      for (const s of sessions) {
        await vitestInvoke('test_createWorkoutSession', {
          tenant_id: TEST_TENANT,
          user_id: 'user-1',
          modality: 'strength',
          duration_minutes: 60,
          srpe: 7,
          ...s
        });
      }
    }

    it('should calculate ACWR for each specific day in the range', async () => {
      // Setup: Create sessions on specific days with specific loads
      await setupSessions([
        { date: '2026-02-21', duration_minutes: 70, srpe: 10 }, // Load = 700 (acute day)
        { date: '2026-02-14', duration_minutes: 70, srpe: 10 }, // Load = 700 (8 days ago)
      ]);

      const result = await vitestInvoke<any[]>('test_calculateHistoricalACWR', {
        tenant_id: TEST_TENANT,
        user_id: 'user-1',
        start_date: '2026-02-21',
        end_date: '2026-02-21'
      });

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2026-02-21');
      
      // On Feb 21: acute = 700 (just this day), chronic = (700 + 700) / 4 = 350
      expect(result[0].acute_load).toBe(700);
      expect(result[0].chronic_load).toBe(350);
      expect(result[0].ratio).toBeCloseTo(2.0, 1);
    });

    it('should calculate different ACWR for each historical day', async () => {
      // Create sessions across multiple days
      await setupSessions([
        { date: '2026-02-21', duration_minutes: 100, srpe: 10 }, // Load = 1000
        { date: '2026-02-20', duration_minutes: 50, srpe: 10 },  // Load = 500
        { date: '2026-02-19', duration_minutes: 50, srpe: 10 },  // Load = 500
      ]);

      const result = await vitestInvoke<any[]>('test_calculateHistoricalACWR', {
        tenant_id: TEST_TENANT,
        user_id: 'user-1',
        start_date: '2026-02-19',
        end_date: '2026-02-21'
      });

      expect(result).toHaveLength(3);

      // Feb 19: acute = 500, chronic = 500/4 = 125
      expect(result[0].date).toBe('2026-02-19');
      expect(result[0].acute_load).toBe(500);
      expect(result[0].ratio).toBeCloseTo(4.0, 1);

      // Feb 20: acute = 1000 (500 + 500), chronic = 1000/4 = 250
      expect(result[1].date).toBe('2026-02-20');
      expect(result[1].acute_load).toBe(1000);
      expect(result[1].ratio).toBeCloseTo(4.0, 1);

      // Feb 21: acute = 2000, chronic = 2000/4 = 500
      expect(result[2].date).toBe('2026-02-21');
      expect(result[2].acute_load).toBe(2000);
      expect(result[2].ratio).toBeCloseTo(4.0, 1);
    });

    it('should include zone classification flags', async () => {
      await setupSessions([
        { date: '2026-02-21', duration_minutes: 100, srpe: 10 } // High load
      ]);

      const result = await vitestInvoke<any[]>('test_calculateHistoricalACWR', {
        tenant_id: TEST_TENANT,
        user_id: 'user-1',
        start_date: '2026-02-21',
        end_date: '2026-02-21'
      });

      expect(result[0]).toHaveProperty('isDanger');
      expect(result[0]).toHaveProperty('isOptimal');
      expect(result[0]).toHaveProperty('isUnderTraining');
      expect(result[0]).toHaveProperty('session_count');
    });

    it('should count sessions for each day', async () => {
      // Two sessions on the same day
      await setupSessions([
        { date: '2026-02-21', duration_minutes: 30, srpe: 7 },
        { date: '2026-02-21', duration_minutes: 30, srpe: 7 }
      ]);

      const result = await vitestInvoke<any[]>('test_calculateHistoricalACWR', {
        tenant_id: TEST_TENANT,
        user_id: 'user-1',
        start_date: '2026-02-21',
        end_date: '2026-02-21'
      });

      expect(result[0].session_count).toBe(2);
    });

    it('should handle days with no sessions', async () => {
      await setupSessions([
        { date: '2026-02-21', duration_minutes: 60, srpe: 7 }
      ]);

      const result = await vitestInvoke<any[]>('test_calculateHistoricalACWR', {
        tenant_id: TEST_TENANT,
        user_id: 'user-1',
        start_date: '2026-02-19',
        end_date: '2026-02-21'
      });

      expect(result).toHaveLength(3);
      
      // Feb 19 and 20 have no sessions
      expect(result[0].session_count).toBe(0);
      expect(result[0].acute_load).toBe(0);
      expect(result[0].ratio).toBe(0);
      
      expect(result[1].session_count).toBe(0);
      expect(result[1].acute_load).toBe(0);
      expect(result[1].ratio).toBe(0);

      // Feb 21 has one session
      expect(result[2].session_count).toBe(1);
      expect(result[2].acute_load).toBe(420);
    });

    it('should return empty array for date range with no data', async () => {
      const result = await vitestInvoke<any[]>('test_calculateHistoricalACWR', {
        tenant_id: TEST_TENANT,
        user_id: 'user-1',
        start_date: '2026-02-01',
        end_date: '2026-02-07'
      });

      expect(result).toHaveLength(7);
      result.forEach(day => {
        expect(day.acute_load).toBe(0);
        expect(day.chronic_load).toBe(0);
        expect(day.ratio).toBe(0);
        expect(day.session_count).toBe(0);
      });
    });
  });

  describe('getACWRTrendSummary', () => {
    async function setupSessions(sessions: Partial<CreateWorkoutSessionInput>[]) {
      for (const s of sessions) {
        await vitestInvoke('test_createWorkoutSession', {
          tenant_id: TEST_TENANT,
          user_id: 'user-1',
          modality: 'strength',
          duration_minutes: 60,
          srpe: 7,
          ...s
        });
      }
    }

    it('should return trend summary with correct statistics', async () => {
      // Create varied load over a week
      await setupSessions([
        { date: '2026-02-15', duration_minutes: 50, srpe: 7 },  // Load = 350
        { date: '2026-02-16', duration_minutes: 60, srpe: 8 },  // Load = 480
        { date: '2026-02-17', duration_minutes: 40, srpe: 6 },  // Load = 240
        { date: '2026-02-18', duration_minutes: 70, srpe: 9 },  // Load = 630
        { date: '2026-02-19', duration_minutes: 55, srpe: 7 },  // Load = 385
        { date: '2026-02-20', duration_minutes: 65, srpe: 8 },  // Load = 520
        { date: '2026-02-21', duration_minutes: 60, srpe: 7 },  // Load = 420
      ]);

      const result = await vitestInvoke<any>('test_getACWRTrendSummary', {
        tenant_id: TEST_TENANT,
        user_id: 'user-1',
        start_date: '2026-02-15',
        end_date: '2026-02-21'
      });

      expect(result).toHaveProperty('avg_ratio');
      expect(result).toHaveProperty('max_ratio');
      expect(result).toHaveProperty('min_ratio');
      expect(result).toHaveProperty('days_in_danger_zone');
      expect(result).toHaveProperty('days_in_optimal_zone');
      expect(result).toHaveProperty('days_under_training');
      expect(result).toHaveProperty('trend_direction');

      expect(result.max_ratio).toBeGreaterThanOrEqual(result.min_ratio);
      expect(result.avg_ratio).toBeGreaterThanOrEqual(result.min_ratio);
      expect(result.avg_ratio).toBeLessThanOrEqual(result.max_ratio);
    });

    it('should calculate trend direction based on first half vs second half comparison', async () => {
      // Test that trend detection works - it compares first half to second half
      // and returns 'increasing', 'decreasing', or 'stable' based on the difference
      
      // Create a clear decreasing pattern: high load early, low load later
      const baseDate = new Date('2026-02-01');
      
      // First 7 days: high load (will be first half of 14-day range)
      for (let i = 0; i < 7; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        await setupSessions([{
          date: date.toISOString().split('T')[0],
          duration_minutes: 90,
          srpe: 9  // Load = 810
        }]);
      }
      
      // Next 7 days: low load (will be second half)
      for (let i = 7; i < 14; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        await setupSessions([{
          date: date.toISOString().split('T')[0],
          duration_minutes: 20,
          srpe: 3  // Load = 60
        }]);
      }

      const result = await vitestInvoke<any>('test_getACWRTrendSummary', {
        tenant_id: TEST_TENANT,
        user_id: 'user-1',
        start_date: '2026-02-01',
        end_date: '2026-02-14'
      });

      // Should detect decreasing trend (high to low)
      expect(result.trend_direction).toBe('decreasing');
      expect(result).toHaveProperty('avg_ratio');
      expect(result).toHaveProperty('max_ratio');
      expect(result).toHaveProperty('min_ratio');
    });

    it('should detect decreasing trend', async () => {
      // Gradually decreasing load over 14 days
      const baseDate = new Date('2026-02-08');
      for (let i = 0; i < 14; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        // Start with high load, gradually decrease
        const duration = 90 - (i * 5);
        const srpe = 9 - Math.floor(i / 4);
        await setupSessions([{
          date: date.toISOString().split('T')[0],
          duration_minutes: Math.max(30, duration),
          srpe: Math.max(5, srpe)
        }]);
      }

      const result = await vitestInvoke<any>('test_getACWRTrendSummary', {
        tenant_id: TEST_TENANT,
        user_id: 'user-1',
        start_date: '2026-02-08',
        end_date: '2026-02-21'
      });

      // With significantly decreasing load over 14 days, trend should be decreasing
      expect(result.trend_direction).toBe('decreasing');
    });

    it('should return stable trend for consistent load', async () => {
      // Consistent load
      for (let i = 0; i < 7; i++) {
        const date = new Date('2026-02-15');
        date.setDate(date.getDate() + i);
        await setupSessions([{
          date: date.toISOString().split('T')[0],
          duration_minutes: 60,
          srpe: 7 // Load = 420
        }]);
      }

      const result = await vitestInvoke<any>('test_getACWRTrendSummary', {
        tenant_id: TEST_TENANT,
        user_id: 'user-1',
        start_date: '2026-02-15',
        end_date: '2026-02-21'
      });

      expect(result.trend_direction).toBe('stable');
    });

    it('should return zeroed summary for empty date range', async () => {
      const result = await vitestInvoke<any>('test_getACWRTrendSummary', {
        tenant_id: TEST_TENANT,
        user_id: 'user-1',
        start_date: '2026-02-01',
        end_date: '2026-02-07'
      });

      expect(result.avg_ratio).toBe(0);
      expect(result.max_ratio).toBe(0);
      expect(result.min_ratio).toBe(0);
      expect(result.days_in_danger_zone).toBe(0);
      expect(result.days_in_optimal_zone).toBe(0);
      // When ratio is 0, it counts as under-training (< 0.8)
      expect(result.days_under_training).toBe(7);
      expect(result.trend_direction).toBe('stable');
    });
  });
});
