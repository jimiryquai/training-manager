import { env } from 'cloudflare:workers';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { Database } from '../db/schema';
import {
  createTenantSettings,
  createUser,
  createDailyWellness,
  createWorkoutSession,
  createExercise,
  upsertUserBenchmark,
} from '../services';

const TENANT_ID = 'seed-tenant-001';
const USER_ID = 'seed-user-001';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Insert records in batches to avoid D1 SQL variable limits
 * D1 has a limit on SQL variables per query, so we batch inserts
 */
async function insertWellnessBatch(
  db: Kysely<Database>,
  records: Array<{
    tenant_id: string;
    user_id: string;
    date: string;
    rhr: number;
    hrv_rmssd: number;
  }>,
  batchSize = 5
) {
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    for (const record of batch) {
      await createDailyWellness(db, record);
    }
  }
}

async function insertWorkoutBatch(
  db: Kysely<Database>,
  records: Array<{
    tenant_id: string;
    user_id: string;
    date: string;
    duration_minutes: number;
    srpe: number;
  }>,
  batchSize = 5
) {
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    for (const record of batch) {
      await createWorkoutSession(db, record);
    }
  }
}

export default async function seed() {
  const db = new Kysely<Database>({
    dialect: new D1Dialect({ database: env.DB }),
  });

  const today = new Date();
  
  console.log(`🌱 Seeding Agent-Native Training Manager`);
  console.log(`📅 Date range: 28 days ending ${formatDate(today)}`);
  console.log('📋 Pattern: 3 base weeks + 1 "hell week" (overreaching)');

  console.log('');
  console.log('🗑️  Clearing existing seed data...');
  
  await db.deleteFrom('daily_wellness')
    .where('tenant_id', '=', TENANT_ID)
    .where('user_id', '=', USER_ID)
    .execute();
  
  await db.deleteFrom('workout_session')
    .where('tenant_id', '=', TENANT_ID)
    .where('user_id', '=', USER_ID)
    .execute();

  await db.deleteFrom('user_benchmarks')
    .where('tenant_id', '=', TENANT_ID)
    .where('user_id', '=', USER_ID)
    .execute();

  console.log('🏢 Creating tenant settings...');
  await createTenantSettings(db, {
    tenant_id: TENANT_ID,
    organization_name: 'Seed Organization',
    timezone: 'America/New_York',
    default_barbell_rounding: 2.5,
  });

  console.log('👤 Creating user...');
  await createUser(db, {
    id: USER_ID,
    tenant_id: TENANT_ID,
    email: 'athlete@seed.local',
    role: 'athlete',
    is_active: 1,
  });

  console.log('🏋️  Creating user benchmarks...');
  await upsertUserBenchmark(db, {
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    benchmark_name: 'Squat',
    benchmark_value: 180,
    benchmark_unit: 'kg',
    training_max_percentage: 90,
  });
  await upsertUserBenchmark(db, {
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    benchmark_name: 'Deadlift',
    benchmark_value: 220,
    benchmark_unit: 'kg',
    training_max_percentage: 90,
  });
  await upsertUserBenchmark(db, {
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    benchmark_name: 'Bench Press',
    benchmark_value: 120,
    benchmark_unit: 'kg',
    training_max_percentage: 90,
  });

  console.log('📚 Creating system exercises...');
  // Create some global system exercises
  const exercises = [
    { name: 'Barbell Squat', movement_category: 'squat' as const, exercise_type: 'dynamic' as const, benchmark_target: 'Squat' },
    { name: 'Goblet Squat', movement_category: 'squat' as const, exercise_type: 'dynamic' as const, benchmark_target: 'Squat', conversion_factor: 0.5 },
    { name: 'Barbell Deadlift', movement_category: 'hinge' as const, exercise_type: 'dynamic' as const, benchmark_target: 'Deadlift' },
    { name: 'Barbell Bench Press', movement_category: 'push' as const, exercise_type: 'dynamic' as const, benchmark_target: 'Bench Press' },
    { name: 'Pull-up', movement_category: 'pull' as const, exercise_type: 'dynamic' as const, benchmark_target: null },
    { name: 'Farmer\'s Carry', movement_category: 'carry' as const, exercise_type: 'dynamic' as const, benchmark_target: null },
    { name: 'Plank Hold', movement_category: 'core' as const, exercise_type: 'isometric' as const, benchmark_target: null },
    { name: 'Rowing', movement_category: 'cardio' as const, exercise_type: 'dynamic' as const, benchmark_target: null },
  ];

  for (const exercise of exercises) {
    await createExercise(db, {
      tenant_id: null, // Global system template
      ...exercise,
    });
  }

  console.log('💪 Inserting 28 days of wellness data...');
  const wellnessRecords: Array<{
    tenant_id: string;
    user_id: string;
    date: string;
    rhr: number;
    hrv_rmssd: number;
  }> = [];
  const workoutRecords: Array<{
    tenant_id: string;
    user_id: string;
    date: string;
    duration_minutes: number;
    srpe: number;
  }> = [];

  for (let i = 27; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = formatDate(date);
    
    const dayIndex = 27 - i;
    const week = Math.floor(dayIndex / 7);
    const dayOfWeek = dayIndex % 7;

    let rhr = 48 + randomInt(0, 4);
    let hrv_rmssd = 58 + randomInt(0, 9);

    if (week === 3) {
      rhr += 10 + randomInt(0, 4);
      hrv_rmssd = Math.max(35, hrv_rmssd - 20 + randomInt(0, 5));
    }
    
    wellnessRecords.push({
      tenant_id: TENANT_ID,
      user_id: USER_ID,
      date: dateStr,
      rhr,
      hrv_rmssd,
    });

    let duration = 0;
    let srpe = 0;

    if (week < 3) {
      // Base training weeks
      switch (dayOfWeek) {
        case 0: duration = 60; srpe = 4; break;
        case 1: duration = 45; srpe = 6; break;
        case 2: duration = 90; srpe = 3; break;
        case 3: break; // Rest day
        case 4: duration = 40; srpe = 8; break;
        case 5: duration = 60; srpe = 7; break;
        case 6: duration = 120; srpe = 4; break;
      }
    } else {
      // Hell week (overreaching)
      switch (dayOfWeek) {
        case 0: duration = 90; srpe = 6; break;
        case 1: duration = 60; srpe = 8; break;
        case 2: duration = 120; srpe = 5; break;
        case 3: duration = 45; srpe = 9; break;
        case 4: duration = 60; srpe = 8; break;
        case 5: duration = 90; srpe = 8; break;
        case 6: duration = 150; srpe = 6; break;
      }
    }

    if (duration > 0) {
      workoutRecords.push({
        tenant_id: TENANT_ID,
        user_id: USER_ID,
        date: dateStr,
        duration_minutes: duration,
        srpe,
      });
    }
  }
  
  await insertWellnessBatch(db, wellnessRecords, 5);
  await insertWorkoutBatch(db, workoutRecords, 5);

  console.log('');
  console.log('✅ Seed complete!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - 1 tenant (id: ${TENANT_ID})`);
  console.log(`   - 1 user (id: ${USER_ID})`);
  console.log(`   - 28 daily wellness records`);
  console.log(`   - ${workoutRecords.length} workout sessions`);
  console.log(`   - 3 user benchmarks (Squat, Deadlift, Bench)`);
  console.log(`   - ${exercises.length} system exercises`);
  console.log(`   - Weeks 1-3: Base training (ACWR ~1.0-1.2)`);
  console.log(`   - Week 4: Overreaching block (ACWR should spike >1.5)`);
}
