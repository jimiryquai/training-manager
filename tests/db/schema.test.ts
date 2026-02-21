import { describe, it, expectTypeOf } from 'vitest';
import type { Database, Modality } from '../../src/db/schema';

describe('Database Schema Types', () => {
  it('should have correct Modality types', () => {
    type ExpectedModality = 'strength' | 'rowing' | 'running' | 'cycling' | 'swimming' | 'other';
    expectTypeOf<Modality>().toEqualTypeOf<ExpectedModality>();
  });

  it('should have user table with tenant_id', () => {
    expectTypeOf<Database['user']['tenant_id']>().toBeString();
  });

  it('should have daily_wellness with rhr and hrv_rmssd', () => {
    expectTypeOf<Database['daily_wellness']['rhr']>().toBeNumber();
    expectTypeOf<Database['daily_wellness']['hrv_rmssd']>().toBeNumber();
  });

  it('should have workout_session with computed training_load', () => {
    expectTypeOf<Database['workout_session']['training_load']>().toBeNumber();
    expectTypeOf<Database['workout_session']['srpe']>().toBeNumber();
    expectTypeOf<Database['workout_session']['duration_minutes']>().toBeNumber();
  });
});
