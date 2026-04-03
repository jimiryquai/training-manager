import { env } from 'cloudflare:workers';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { Database } from '../db/schema';
import {
  createUser,
  createDailyWellness,
  createWorkoutSession,
  createExercise,
  upsertUserBenchmark,
  createTrainingPlan,
} from '../services';
import {
  createTrainingSession,
} from '../services/trainingSession.service';
import {
  createSessionExercise,
} from '../services/sessionExercise.service';

// Import the legacy data JSON
import legacyData from '../../strength-card-data.json';

const TENANT_ID = 'seed-tenant-001';

// ============================================================================
// Type definitions for legacy JSON structure
// ============================================================================

interface LegacyAthlete {
  '#': number;
  Name: string;
  Active: string;
  BW: number;
  Squat?: number;
  'Bench Press'?: number;
  Deadlift?: number;
  'Pull-Up'?: number | string;
  Clean?: number | string;
}

interface LegacyExercise {
  Name: string;
  Category: string;
  '%': number;
  'Related to': string;
  '%BW used': number;
  'Equipment used': string;
  Rounding: number;
  Note?: string;
}

interface LegacySetRepScheme {
  '#'?: number;
  'Set & Rep Scheme Name'?: string;
  Category?: string;
  Set?: string;
  'Week 1'?: number | string;
  '__EMPTY'?: number;
  'Week 2'?: number | string;
  '__EMPTY_1'?: number;
  'Week 3'?: number | string;
  '__EMPTY_2'?: number;
  'Week 4'?: number | string;
  '__EMPTY_3'?: number;
}

interface LegacyData {
  Athletes: LegacyAthlete[];
  Exercises: LegacyExercise[];
  'Set & Reps Schemes': LegacySetRepScheme[];
}

// ============================================================================
// Category mapping from legacy to movement_category values
// ============================================================================

const CATEGORY_MAP: Record<string, string> = {
  'UB Horizontal Pull': 'horizontal_pull',
  'UB Horizontal Push': 'horizontal_push',
  'UB Vertical Pull': 'vertical_pull',
  'UB Vertical Push': 'vertical_push',
  'LB Push 1-Leg Accelerative': 'unilateral_leg',
  'LB Push 1-Leg Deccelerative': 'unilateral_leg',
  'LB Push 1-Leg Supported': 'unilateral_leg',
  'LB Push 1-Leg Unsupported': 'unilateral_leg',
  'LB Push 2-Leg': 'bilateral_leg',
  'LB Pull 1-Leg Bent': 'unilateral_leg',
  'LB Pull 1-Leg Straight': 'unilateral_leg',
  'LB Pull 2-Leg Bent': 'hinge',
  'LB Pull 2-Leg Straight': 'hinge',
  'Core': 'core',
  'Corrective': 'mobility',
  'Explosive lift': 'conditioning',
  'Isolation': 'horizontal_push',
  'Olympic lift': 'conditioning',
  'Rotational': 'core_rotation',
};

// Map benchmark target names to normalized names
const BENCHMARK_TARGET_MAP: Record<string, string> = {
  'Squat': 'Squat',
  'squat': 'Squat',
  'MP': 'Bench Press', // Military Press maps to Bench Press as upper body push
  'Bench Press': 'Bench Press',
  'Bench': 'Bench Press',
  'BP': 'Bench Press',
  'Deadlift': 'Deadlift',
  'DL': 'Deadlift',
  'Pull-Up': 'Pull-Up',
  'Pull-up': 'Pull-Up',
  'Pull Up': 'Pull-Up',
  'PU': 'Pull-Up',
  'Chin-Up': 'Pull-Up',
  'Clean': 'Clean',
};

function getMovementCategory(legacyCategory: string): string {
  return CATEGORY_MAP[legacyCategory] || 'mobility';
}

function getBenchmarkTarget(relatedTo: string): string | null {
  if (!relatedTo) return null;
  return BENCHMARK_TARGET_MAP[relatedTo] || relatedTo;
}

function parseNumberValue(value: number | string | undefined): number | null {
  if (value === undefined || value === '' || value === null) return null;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Insert records in batches to avoid D1 SQL variable limits
 * D1 has a limit on SQL variables per query, so we batch inserts
 * CRITICAL: Use batch size of 5-10 to avoid "too many SQL variables" error
 */
async function insertBatch<T>(
  items: T[],
  batchSize: number,
  inserter: (batch: T[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await inserter(batch);
  }
}

export default async function seed() {
  const db = new Kysely<Database>({
    dialect: new D1Dialect({ database: env.DB }),
  });

  const data = legacyData as LegacyData;
  
  console.log(`🌱 Seeding Agent-Native Training Manager with Legacy Data`);
  console.log(`📊 Found ${data.Athletes.length} athletes`);
  console.log(`📚 Found ${data.Exercises.length} exercises`);
  console.log(`📋 Found ${data['Set & Reps Schemes'].length} set/rep scheme rows`);

  // ==========================================================================
  // PHASE 1: Clear existing seed data
  // ==========================================================================
  console.log('');
  console.log('🗑️  Clearing existing seed data...');
  
  // Delete in reverse dependency order
  await db.deleteFrom('session_exercise')
    .where('tenant_id', '=', TENANT_ID)
    .execute();

  await db.deleteFrom('training_session')
    .where('tenant_id', '=', TENANT_ID)
    .execute();

  await db.deleteFrom('training_plan')
    .where('tenant_id', '=', TENANT_ID)
    .execute();

  // Clear global system training plans (tenant_id is null)
  await db.deleteFrom('training_plan')
    .where('tenant_id', 'is', null)
    .where('is_system_template', '=', 1)
    .execute();

  await db.deleteFrom('workout_session')
    .where('tenant_id', '=', TENANT_ID)
    .execute();

  await db.deleteFrom('daily_wellness')
    .where('tenant_id', '=', TENANT_ID)
    .execute();

  await db.deleteFrom('user_benchmarks')
    .where('tenant_id', '=', TENANT_ID)
    .execute();

  await db.deleteFrom('user')
    .where('tenant_id', '=', TENANT_ID)
    .execute();

  // Clear tenant settings for this seed tenant
  await db.deleteFrom('tenant_settings')
    .where('tenant_id', '=', TENANT_ID)
    .execute();

  // Clear global system exercises (tenant_id is null)
  await db.deleteFrom('exercise_dictionary')
    .where('tenant_id', 'is', null)
    .execute();

  // ==========================================================================
  // PHASE 2: Create tenant settings
  // ==========================================================================
  // NOTE: tenant_settings table exists but has no production consumers yet.
  // Skipping tenant settings creation in seed.

  // ==========================================================================
  // PHASE 3: Map Athletes to User and UserBenchmark tables
  // ==========================================================================
  console.log('👤 Creating users from athletes...');
  
  const athleteToUserId: Record<string, string> = {};
  
  // Batch insert users (5 at a time to respect D1 limits)
  const athletes = data.Athletes;
  await insertBatch(athletes, 5, async (batch) => {
    for (const athlete of batch) {
      const userId = `athlete-${athlete['#']}`;
      athleteToUserId[athlete.Name] = userId;
      
      const isActive = athlete.Active === 'Yes' ? 1 : 0;
      
      await createUser(db, {
        id: userId,
        tenant_id: TENANT_ID,
        email: `${athlete.Name.toLowerCase().replace(/\s+/g, '.')}@legacy.local`,
        display_name: athlete.Name,
        role: 'athlete',
        is_active: isActive,
      });
    }
  });
  
  console.log(`✅ Created ${athletes.length} users`);

  // Create user benchmarks for each athlete
  console.log('🏋️  Creating user benchmarks...');
  
  let benchmarkCount = 0;
  const liftFields: Array<{ field: keyof LegacyAthlete; name: string; unit: 'kg' | 'reps' }> = [
    { field: 'Squat', name: 'Squat', unit: 'kg' },
    { field: 'Bench Press', name: 'Bench Press', unit: 'kg' },
    { field: 'Deadlift', name: 'Deadlift', unit: 'kg' },
    { field: 'Pull-Up', name: 'Pull-Up', unit: 'kg' },
    { field: 'Clean', name: 'Clean', unit: 'kg' },
  ];

  // Process benchmarks in small batches
  const benchmarkItems: Array<{ athlete: LegacyAthlete; lift: typeof liftFields[0] }> = [];
  for (const athlete of athletes) {
    for (const lift of liftFields) {
      const value = parseNumberValue(athlete[lift.field] as number | string | undefined);
      if (value !== null && value > 0) {
        benchmarkItems.push({ athlete, lift });
      }
    }
  }

  await insertBatch(benchmarkItems, 5, async (batch) => {
    for (const { athlete, lift } of batch) {
      const userId = athleteToUserId[athlete.Name];
      if (!userId) continue;
      
      const benchmarkValue = parseNumberValue(athlete[lift.field] as number | string | undefined);
      await upsertUserBenchmark(db, {
        tenant_id: TENANT_ID,
        user_id: userId,
        benchmark_name: lift.name,
        benchmark_value: benchmarkValue,
        benchmark_unit: lift.unit,
        training_max_percentage: 90,
      });
      benchmarkCount++;
    }
  });
  
  console.log(`✅ Created ${benchmarkCount} user benchmarks`);

  // ==========================================================================
  // PHASE 4: Map Exercises to ExerciseDictionary table (GLOBAL templates)
  // ==========================================================================
  console.log('📚 Creating global system exercises...');
  
  let exerciseCount = 0;
  const exercises = data.Exercises;
  
  // Batch insert exercises (5 at a time to respect D1 limits)
  await insertBatch(exercises, 5, async (batch) => {
    for (const exercise of batch) {
      if (!exercise.Name) continue;
      
      await createExercise(db, {
        tenant_id: null, // NULL = Global System Template
        name: exercise.Name,
        movement_category: getMovementCategory(exercise.Category),
        exercise_type: 'dynamic', // Default to dynamic
        benchmark_target: getBenchmarkTarget(exercise['Related to']),
        conversion_factor: exercise['%'] || null,
      });
      exerciseCount++;
    }
  });
  
  console.log(`✅ Created ${exerciseCount} global exercises`);

  // ==========================================================================
  // PHASE 5: Parse and map Set & Rep Schemes to periodization tables
  // ==========================================================================
  console.log('📋 Parsing set & rep schemes...');
  
  // Parse schemes into structured format
  interface ParsedScheme {
    name: string;
    category: string;
    sets: Array<{
      setNumber: number;
      weeks: Array<{
        week: number;
        percentage: number | null;
        reps: number | null;
      }>;
    }>;
  }
  
  const parsedSchemes: ParsedScheme[] = [];
  const schemeRows = data['Set & Reps Schemes'];
  
  let currentScheme: ParsedScheme | null = null;
  let currentSetNumber = 0;
  
  for (const row of schemeRows) {
    // Check if this is a new scheme header
    if (row['#'] !== undefined && row['Set & Rep Scheme Name']) {
      // Save previous scheme
      if (currentScheme) {
        parsedSchemes.push(currentScheme);
      }
      
      currentScheme = {
        name: row['Set & Rep Scheme Name'],
        category: row['Category'] || 'Unknown',
        sets: [],
      };
      currentSetNumber = 0;
    }
    
    // Parse set data
    if (currentScheme && row.Set) {
      const setMatch = row.Set.match(/Set (\d+)/);
      if (setMatch) {
        currentSetNumber = parseInt(setMatch[1]);
        
        const setData = {
          setNumber: currentSetNumber,
          weeks: [
            {
              week: 1,
              percentage: typeof row['Week 1'] === 'number' ? row['Week 1'] : null,
              reps: row['__EMPTY'] ?? null,
            },
            {
              week: 2,
              percentage: typeof row['Week 2'] === 'number' ? row['Week 2'] : null,
              reps: row['__EMPTY_1'] ?? null,
            },
            {
              week: 3,
              percentage: typeof row['Week 3'] === 'number' ? row['Week 3'] : null,
              reps: row['__EMPTY_2'] ?? null,
            },
            {
              week: 4,
              percentage: typeof row['Week 4'] === 'number' ? row['Week 4'] : null,
              reps: row['__EMPTY_3'] ?? null,
            },
          ],
        };
        
        currentScheme.sets.push(setData);
      }
    }
  }
  
  // Don't forget the last scheme
  if (currentScheme) {
    parsedSchemes.push(currentScheme);
  }
  
  console.log(`✅ Parsed ${parsedSchemes.length} unique set/rep schemes`);
  
  // Create TrainingPlan entries for each scheme category
  const categories = [...new Set(parsedSchemes.map(s => s.category))];
  console.log(`📁 Found ${categories.length} scheme categories: ${categories.join(', ')}`);
  
  // Create a training plan for each category
  const categoryToPlanId: Record<string, string> = {};
  
  for (const category of categories) {
    const plan = await createTrainingPlan(db, {
      tenant_id: null, // Global system template
      name: `${category} Schemes`,
      is_system_template: 1,
    });
    
    if (plan) {
      categoryToPlanId[category] = plan.id;
    }
  }
  
  console.log(`✅ Created ${categories.length} training plan templates`);
  
  // Create TrainingSession and SessionExercise entries for each scheme
  let sessionCount = 0;
  let exerciseRecordCount = 0;
  
  // Get all exercises to link them
  const allExercises = await db.selectFrom('exercise_dictionary').selectAll().execute();
  const exerciseMap: Record<string, string> = {};
  allExercises.forEach(ex => {
    exerciseMap[ex.name] = ex.id;
  });

  await insertBatch(parsedSchemes, 3, async (batch) => {
    for (const scheme of batch) {
      const planId = categoryToPlanId[scheme.category];
      if (!planId) continue;
      
      // Try to find a matching exercise for this scheme name, or fallback to a category-standard one
      let exerciseId = exerciseMap[scheme.name] || 
                       allExercises.find(ex => ex.movement_category === getMovementCategory(scheme.category))?.id ||
                       allExercises[0]?.id;

      if (!exerciseId) continue;

      // Create a session for weeks 1-4 of this scheme
      for (let week = 1; week <= 4; week++) {
        const session = await createTrainingSession(db, {
          tenant_id: TENANT_ID,
          plan_id: planId,
          block_name: scheme.category,
          week_number: week,
          day_of_week: null,
          session_name: `${scheme.name} - Week ${week}`,
        });
        
        if (session) {
          sessionCount++;

          // Create session exercises for each set in this scheme for this week
          // In the flattened Agent-Native model, we can group sets or have them individual.
          // For the seed, we'll create one SessionExercise per set to show full flattening.
          for (const set of scheme.sets) {
            const weekData = set.weeks.find(w => w.week === week);
            if (!weekData || (weekData.reps === null && weekData.percentage === null)) continue;

            await createSessionExercise(db, {
              tenant_id: TENANT_ID,
              session_id: session.id,
              exercise_dictionary_id: exerciseId,
              order_in_session: set.setNumber,
              scheme_name: scheme.name,
              target_sets: 1, // Individual set record
              target_reps: weekData.reps?.toString() || null,
              target_intensity: weekData.percentage || null,
              coach_notes: `Set ${set.setNumber} for ${scheme.name}`,
            });
            exerciseRecordCount++;
          }
        }
      }
    }
  });
  
  console.log(`✅ Created ${sessionCount} training sessions`);
  console.log(`✅ Created ${exerciseRecordCount} session exercises (flattened metrics)`);

  // ==========================================================================
  // PHASE 6: Summary
  // ==========================================================================
  console.log('');
  console.log('✅ Legacy data seed complete!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - 1 tenant (id: ${TENANT_ID})`);
  console.log(`   - ${athletes.length} users (athletes)`);
  console.log(`   - ${benchmarkCount} user benchmarks`);
  console.log(`   - ${exerciseCount} global system exercises`);
  console.log(`   - ${categories.length} training plan templates`);
  console.log(`   - ${sessionCount} training sessions`);
  console.log(`   - ${exerciseRecordCount} session exercises (flattened)`);
  console.log(`   - ${parsedSchemes.length} unique set/rep schemes parsed`);
}
