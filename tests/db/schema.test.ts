import { describe, it, expectTypeOf } from 'vitest';
import type { Database, MovementCategory, ExerciseType, BenchmarkUnit } from '../../src/db/schema';

describe('Database Schema Types', () => {
  it('should have correct MovementCategory types', () => {
    type ExpectedMovementCategory =
      | 'squat'
      | 'hinge'
      | 'push'
      | 'pull'
      | 'carry'
      | 'core'
      | 'cardio'
      | 'horizontal_push'
      | 'horizontal_pull'
      | 'vertical_push'
      | 'vertical_pull'
      | 'unilateral_leg'
      | 'bilateral_leg'
      | 'core_flexion'
      | 'core_rotation'
      | 'core_antiextension'
      | 'core_antilateral'
      | 'conditioning'
      | 'mobility'
      | 'warmup'
      | 'cooldown';
    
    expectTypeOf<MovementCategory>().toEqualTypeOf<ExpectedMovementCategory>();
  });

  it('should have correct ExerciseType types', () => {
    type ExpectedExerciseType = 'dynamic' | 'isometric' | 'eccentric';
    expectTypeOf<ExerciseType>().toEqualTypeOf<ExpectedExerciseType>();
  });

  it('should have correct BenchmarkUnit types', () => {
    type ExpectedBenchmarkUnit = 'kg' | 'lbs' | 'seconds' | 'reps' | 'meters';
    expectTypeOf<BenchmarkUnit>().toEqualTypeOf<ExpectedBenchmarkUnit>();
  });

  it('should have user table with required fields', () => {
    expectTypeOf<Database['user']>().toHaveProperty('tenant_id');
    expectTypeOf<Database['user']>().toHaveProperty('email');
    expectTypeOf<Database['user']>().toHaveProperty('external_auth_id');
    expectTypeOf<Database['user']>().toHaveProperty('role');
    expectTypeOf<Database['user']>().toHaveProperty('is_active');
  });

  it('should have daily_wellness with wellness fields', () => {
    expectTypeOf<Database['daily_wellness']>().toHaveProperty('rhr');
    expectTypeOf<Database['daily_wellness']>().toHaveProperty('hrv_rmssd');
    expectTypeOf<Database['daily_wellness']>().toHaveProperty('data_source');
  });

  it('should have workout_session with agent fields', () => {
    expectTypeOf<Database['workout_session']>().toHaveProperty('training_load');
    expectTypeOf<Database['workout_session']>().toHaveProperty('is_voice_entry');
    expectTypeOf<Database['workout_session']>().toHaveProperty('completed_as_planned');
    expectTypeOf<Database['workout_session']>().toHaveProperty('planned_session_id');
  });

  it('should have training_plan with nullable tenant_id', () => {
    expectTypeOf<Database['training_plan']>().toHaveProperty('tenant_id');
    expectTypeOf<Database['training_plan']>().toHaveProperty('is_system_template');
  });

  it('should have session_exercise with circuit_group', () => {
    expectTypeOf<Database['session_exercise']>().toHaveProperty('circuit_group');
    expectTypeOf<Database['session_exercise']>().toHaveProperty('order_in_session');
  });
});
