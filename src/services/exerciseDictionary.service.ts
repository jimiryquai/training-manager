import type { Kysely } from 'kysely';
import type { Database, ExerciseType, BenchmarkUnit, UserBenchmarkTable } from '../db/schema';
import { wrapDatabaseError } from './errors';

// ============================================================================
// Exercise Dictionary Service
// ============================================================================

export interface CreateExerciseInput {
  tenant_id: string | null; // NULL for global system templates
  name: string;
  movement_category: string;
  exercise_type: ExerciseType;
  benchmark_target?: string | null;
  conversion_factor?: number | null;
}

export interface ExerciseDictionaryRecord {
  id: string;
  tenant_id: string | null;
  name: string;
  movement_category: string;
  exercise_type: ExerciseType;
  benchmark_target: string | null;
  conversion_factor: number | null;
}

export async function createExercise(
  db: Kysely<Database>,
  input: CreateExerciseInput
): Promise<ExerciseDictionaryRecord | undefined> {
  return wrapDatabaseError('createExercise', async () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const result = await db
      .insertInto('exercise_dictionary')
      .values({
        id,
        tenant_id: input.tenant_id,
        name: input.name,
        movement_category: input.movement_category,
        exercise_type: input.exercise_type,
        benchmark_target: input.benchmark_target ?? null,
        conversion_factor: input.conversion_factor ?? null,
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface GetExercisesByCategoryInput {
  tenant_id: string | null;
  movement_category: string;
}

/**
 * Get exercises by category
 * If tenant_id is null, returns global system exercises
 * If tenant_id is provided, returns tenant-specific exercises
 */
export async function getExercisesByCategory(
  db: Kysely<Database>,
  input: GetExercisesByCategoryInput
): Promise<ExerciseDictionaryRecord[]> {
  return wrapDatabaseError('getExercisesByCategory', async () => {
    return db
      .selectFrom('exercise_dictionary')
      .where('tenant_id', 'is', input.tenant_id)
      .where('movement_category', '=', input.movement_category)
      .selectAll()
      .execute();
  });
}

export interface GetExerciseByIdInput {
  id: string;
  tenant_id?: string | null;
}

/**
 * Get exercise by ID
 * Optionally filter by tenant_id for security
 */
export async function getExerciseById(
  db: Kysely<Database>,
  input: GetExerciseByIdInput
): Promise<ExerciseDictionaryRecord | undefined> {
  return wrapDatabaseError('getExerciseById', async () => {
    let query = db
      .selectFrom('exercise_dictionary')
      .where('id', '=', input.id);

    if (input.tenant_id !== undefined) {
      query = query.where('tenant_id', 'is', input.tenant_id);
    }

    return query.selectAll().executeTakeFirst();
  });
}

export interface GetExerciseByBenchmarkTargetInput {
  benchmark_target: string;
  tenant_id?: string | null;
}

/**
 * Get all exercises that target a specific benchmark
 * Used to find exercises that contribute to a UserBenchmark
 */
export async function getExercisesByBenchmarkTarget(
  db: Kysely<Database>,
  input: GetExerciseByBenchmarkTargetInput
): Promise<ExerciseDictionaryRecord[]> {
  return wrapDatabaseError('getExercisesByBenchmarkTarget', async () => {
    let query = db
      .selectFrom('exercise_dictionary')
      .where('benchmark_target', '=', input.benchmark_target);

    if (input.tenant_id !== undefined) {
      query = query.where('tenant_id', 'is', input.tenant_id);
    }

    return query.selectAll().execute();
  });
}

/**
 * Get all global system exercises
 * These are the shared library available to all tenants
 */
export async function getSystemExercises(
  db: Kysely<Database>
): Promise<ExerciseDictionaryRecord[]> {
  return wrapDatabaseError('getSystemExercises', async () => {
    return db
      .selectFrom('exercise_dictionary')
      .where('tenant_id', 'is', null)
      .selectAll()
      .execute();
  });
}

/**
 * Get exercises for a tenant (includes global + tenant-specific)
 */
export async function getExercisesForTenant(
  db: Kysely<Database>,
  tenant_id: string
): Promise<ExerciseDictionaryRecord[]> {
  return wrapDatabaseError('getExercisesForTenant', async () => {
    return db
      .selectFrom('exercise_dictionary')
      .where(eb => eb.or([
        eb('tenant_id', 'is', null), // Global exercises
        eb('tenant_id', '=', tenant_id) // Tenant-specific exercises
      ]))
      .selectAll()
      .execute();
  });
}

export interface UpdateExerciseInput {
  id: string;
  tenant_id: string | null;
  name?: string;
  movement_category?: string;
  exercise_type?: ExerciseType;
  benchmark_target?: string | null;
  conversion_factor?: number | null;
}

export async function updateExercise(
  db: Kysely<Database>,
  input: UpdateExerciseInput
): Promise<ExerciseDictionaryRecord | undefined> {
  return wrapDatabaseError('updateExercise', async () => {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updated_at: now };

    if (input.name !== undefined) updates.name = input.name;
    if (input.movement_category !== undefined) updates.movement_category = input.movement_category;
    if (input.exercise_type !== undefined) updates.exercise_type = input.exercise_type;
    if (input.benchmark_target !== undefined) updates.benchmark_target = input.benchmark_target;
    if (input.conversion_factor !== undefined) updates.conversion_factor = input.conversion_factor;

    const result = await db
      .updateTable('exercise_dictionary')
      .set(updates)
      .where('id', '=', input.id)
      .where('tenant_id', 'is', input.tenant_id)
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface DeleteExerciseInput {
  id: string;
  tenant_id: string | null;
}

export async function deleteExercise(
  db: Kysely<Database>,
  input: DeleteExerciseInput
): Promise<boolean> {
  return wrapDatabaseError('deleteExercise', async () => {
    const result = await db
      .deleteFrom('exercise_dictionary')
      .where('id', '=', input.id)
      .where('tenant_id', 'is', input.tenant_id)
      .executeTakeFirst();

    return result.numDeletedRows > 0;
  });
}

// ============================================================================
// User Benchmark Service
// ============================================================================

export interface CreateUserBenchmarkInput {
  tenant_id: string;
  user_id: string;
  benchmark_name: string;
  benchmark_value?: number | null;
  benchmark_unit?: BenchmarkUnit | null;
  training_max_percentage?: number;
}

export type UserBenchmarkRecord = {
  id: string;
  tenant_id: string;
  user_id: string;
  benchmark_name: string;
  benchmark_value: number | null;
  benchmark_unit: BenchmarkUnit | null;
  training_max_percentage: number;
};

/**
 * Create a new user benchmark
 * Use this for explicit creation (not upsert)
 */
export async function createUserBenchmark(
  db: Kysely<Database>,
  input: CreateUserBenchmarkInput
): Promise<UserBenchmarkRecord | undefined> {
  return wrapDatabaseError('createUserBenchmark', async () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const result = await db
      .insertInto('user_benchmarks')
      .values({
        id,
        tenant_id: input.tenant_id,
        user_id: input.user_id,
        benchmark_name: input.benchmark_name,
        benchmark_value: input.benchmark_value ?? null,
        benchmark_unit: input.benchmark_unit ?? null,
        training_max_percentage: input.training_max_percentage ?? 100.0,
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

/**
 * Create or update a user benchmark by name
 * Convenience method for when you don't care about create vs update
 */
export async function upsertUserBenchmark(
  db: Kysely<Database>,
  input: CreateUserBenchmarkInput
): Promise<UserBenchmarkRecord | undefined> {
  return wrapDatabaseError('upsertUserBenchmark', async () => {
    const now = new Date().toISOString();

    const existing = await db
      .selectFrom('user_benchmarks')
      .where('tenant_id', '=', input.tenant_id)
      .where('user_id', '=', input.user_id)
      .where('benchmark_name', '=', input.benchmark_name)
      .selectAll()
      .executeTakeFirst();

    if (existing) {
      const result = await db
        .updateTable('user_benchmarks')
        .set({
          benchmark_value: input.benchmark_value ?? null,
          benchmark_unit: input.benchmark_unit ?? null,
          training_max_percentage: input.training_max_percentage ?? existing.training_max_percentage,
          updated_at: now,
        })
        .where('id', '=', existing.id)
        .returningAll()
        .executeTakeFirst();

      return result;
    }

    const id = crypto.randomUUID();
    const result = await db
      .insertInto('user_benchmarks')
      .values({
        id,
        tenant_id: input.tenant_id,
        user_id: input.user_id,
        benchmark_name: input.benchmark_name,
        benchmark_value: input.benchmark_value ?? null,
        benchmark_unit: input.benchmark_unit ?? null,
        training_max_percentage: input.training_max_percentage ?? 100.0,
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface GetUserBenchmarkInput {
  tenant_id: string;
  user_id: string;
  benchmark_name: string;
}

export async function getUserBenchmark(
  db: Kysely<Database>,
  input: GetUserBenchmarkInput
): Promise<UserBenchmarkRecord | undefined> {
  return wrapDatabaseError('getUserBenchmark', async () => {
    return db
      .selectFrom('user_benchmarks')
      .where('tenant_id', '=', input.tenant_id)
      .where('user_id', '=', input.user_id)
      .where('benchmark_name', '=', input.benchmark_name)
      .selectAll()
      .executeTakeFirst();
  });
}

export interface GetUserBenchmarksInput {
  tenant_id: string;
  user_id: string;
}

export async function getUserBenchmarks(
  db: Kysely<Database>,
  input: GetUserBenchmarksInput
): Promise<UserBenchmarkRecord[]> {
  return wrapDatabaseError('getUserBenchmarks', async () => {
    return db
      .selectFrom('user_benchmarks')
      .where('tenant_id', '=', input.tenant_id)
      .where('user_id', '=', input.user_id)
      .selectAll()
      .execute();
  });
}

/**
 * Calculate the training max for a benchmark
 * Used for Wendler 5/3/1 style programming
 */
export function calculateTrainingMax(benchmark: UserBenchmarkRecord): number | null {
  if (benchmark.benchmark_value === null) return null;
  return benchmark.benchmark_value * (benchmark.training_max_percentage / 100);
}

/**
 * Get the effective training max for an exercise
 * Looks up the benchmark and applies training_max_percentage
 */
export async function getTrainingMaxForExercise(
  db: Kysely<Database>,
  input: {
    tenant_id: string;
    user_id: string;
    exercise_id: string;
  }
): Promise<{ training_max: number | null; benchmark: UserBenchmarkRecord | null }> {
  return wrapDatabaseError('getTrainingMaxForExercise', async () => {
    const exercise = await getExerciseById(db, { id: input.exercise_id });
    
    if (!exercise || !exercise.benchmark_target) {
      return { training_max: null, benchmark: null };
    }

    const benchmark = await getUserBenchmark(db, {
      tenant_id: input.tenant_id,
      user_id: input.user_id,
      benchmark_name: exercise.benchmark_target
    });

    if (!benchmark) {
      return { training_max: null, benchmark: null };
    }

    // Apply conversion factor if present
    let trainingMax = calculateTrainingMax(benchmark);
    if (trainingMax !== null && exercise.conversion_factor !== null) {
      trainingMax = trainingMax * exercise.conversion_factor;
    }

    return { training_max: trainingMax, benchmark };
  });
}

// ============================================================================
// User Benchmark Update/Delete Operations (CRUD Completeness)
// ============================================================================

export interface UpdateUserBenchmarkInput {
  id: string;
  tenant_id: string;
  user_id?: string;
  benchmark_name?: string;
  benchmark_value?: number | null;
  benchmark_unit?: BenchmarkUnit | null;
  training_max_percentage?: number;
}

/**
 * Update a user benchmark by ID
 * Only updates fields that are explicitly provided
 */
export async function updateUserBenchmark(
  db: Kysely<Database>,
  input: UpdateUserBenchmarkInput
): Promise<UserBenchmarkRecord | undefined> {
  return wrapDatabaseError('updateUserBenchmark', async () => {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updated_at: now };

    if (input.benchmark_name !== undefined) updates.benchmark_name = input.benchmark_name;
    if (input.benchmark_value !== undefined) updates.benchmark_value = input.benchmark_value;
    if (input.benchmark_unit !== undefined) updates.benchmark_unit = input.benchmark_unit;
    if (input.training_max_percentage !== undefined) {
      updates.training_max_percentage = input.training_max_percentage;
    }

    let query = db
      .updateTable('user_benchmarks')
      .set(updates)
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id);

    if (input.user_id !== undefined) {
      query = query.where('user_id', '=', input.user_id);
    }

    return query.returningAll().executeTakeFirst();
  });
}

export interface DeleteUserBenchmarkInput {
  id: string;
  tenant_id: string;
  user_id?: string;
}

/**
 * Delete a user benchmark by ID
 * Returns true if a record was deleted, false otherwise
 */
export async function deleteUserBenchmark(
  db: Kysely<Database>,
  input: DeleteUserBenchmarkInput
): Promise<boolean> {
  return wrapDatabaseError('deleteUserBenchmark', async () => {
    let query = db
      .deleteFrom('user_benchmarks')
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id);

    if (input.user_id !== undefined) {
      query = query.where('user_id', '=', input.user_id);
    }

    const result = await query.executeTakeFirst();

    return result.numDeletedRows > 0;
  });
}

export interface DeleteUserBenchmarkByNameInput {
  tenant_id: string;
  user_id: string;
  benchmark_name: string;
}

/**
 * Delete a user benchmark by name
 * Convenience method for deleting by natural key
 */
export async function deleteUserBenchmarkByName(
  db: Kysely<Database>,
  input: DeleteUserBenchmarkByNameInput
): Promise<boolean> {
  return wrapDatabaseError('deleteUserBenchmarkByName', async () => {
    const result = await db
      .deleteFrom('user_benchmarks')
      .where('tenant_id', '=', input.tenant_id)
      .where('user_id', '=', input.user_id)
      .where('benchmark_name', '=', input.benchmark_name)
      .executeTakeFirst();

    return result.numDeletedRows > 0;
  });
}

export interface GetUserBenchmarkByIdInput {
  id: string;
  tenant_id: string;
  user_id?: string;
}

/**
 * Get a user benchmark by ID
 * Alternative lookup when you have the ID but not the name
 */
export async function getUserBenchmarkById(
  db: Kysely<Database>,
  input: GetUserBenchmarkByIdInput
): Promise<UserBenchmarkRecord | undefined> {
  return wrapDatabaseError('getUserBenchmarkById', async () => {
    let query = db
      .selectFrom('user_benchmarks')
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id);

    if (input.user_id !== undefined) {
      query = query.where('user_id', '=', input.user_id);
    }

    return query.selectAll().executeTakeFirst();
  });
}
