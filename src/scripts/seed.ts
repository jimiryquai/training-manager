import { env } from 'cloudflare:workers';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { Database, Modality } from '../db/schema';

const TENANT_ID = 'seed-tenant-001';
const USER_ID = 'seed-user-001';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function insertBatch<T>(
  db: Kysely<Database>,
  table: 'daily_wellness' | 'workout_session',
  records: T[],
  batchSize = 5
) {
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    if (table === 'daily_wellness') {
      await db.insertInto('daily_wellness').values(batch as any).execute();
    } else {
      await db.insertInto('workout_session').values(batch as any).execute();
    }
  }
}

export default async function seed() {
  const db = new Kysely<Database>({
    dialect: new D1Dialect({ database: env.DB }),
  });

  const today = new Date();
  
  console.log(`🌱 Seeding realistic athlete data for tenant: ${TENANT_ID}, user: ${USER_ID}`);
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

  console.log('💪 Inserting 28 days of wellness data...');
  const wellnessRecords = [];
  const workoutRecords = [];

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
      id: crypto.randomUUID(),
      tenant_id: TENANT_ID,
      user_id: USER_ID,
      date: dateStr,
      rhr,
      hrv_rmssd,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    let duration = 0;
    let srpe = 0;
    let modality: Modality = 'rowing';

    if (week < 3) {
      switch (dayOfWeek) {
        case 0: duration = 60; srpe = 4; modality = 'rowing'; break;
        case 1: duration = 45; srpe = 6; modality = 'strength'; break;
        case 2: duration = 90; srpe = 3; modality = 'rowing'; break;
        case 3: break;
        case 4: duration = 40; srpe = 8; modality = 'rowing'; break;
        case 5: duration = 60; srpe = 7; modality = 'strength'; break;
        case 6: duration = 120; srpe = 4; modality = 'rowing'; break;
      }
    } else {
      switch (dayOfWeek) {
        case 0: duration = 90; srpe = 6; modality = 'rowing'; break;
        case 1: duration = 60; srpe = 8; modality = 'strength'; break;
        case 2: duration = 120; srpe = 5; modality = 'rowing'; break;
        case 3: duration = 45; srpe = 9; modality = 'rowing'; break;
        case 4: duration = 60; srpe = 8; modality = 'rowing'; break;
        case 5: duration = 90; srpe = 8; modality = 'strength'; break;
        case 6: duration = 150; srpe = 6; modality = 'rowing'; break;
      }
    }

    if (duration > 0) {
      workoutRecords.push({
        id: crypto.randomUUID(),
        tenant_id: TENANT_ID,
        user_id: USER_ID,
        date: dateStr,
        modality,
        duration_minutes: duration,
        srpe,
        training_load: duration * srpe,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }
  
  await insertBatch(db, 'daily_wellness', wellnessRecords, 5);
  await insertBatch(db, 'workout_session', workoutRecords, 5);

  console.log('');
  console.log('✅ Seed complete!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - 28 daily wellness records`);
  console.log(`   - ${workoutRecords.length} workout sessions`);
  console.log(`   - Weeks 1-3: Base training (ACWR ~1.0-1.2)`);
  console.log(`   - Week 4: Overreaching block (ACWR should spike >1.5)`);
  console.log(`   - Tenant ID: ${TENANT_ID}`);
  console.log(`   - User ID: ${USER_ID}`);
}
