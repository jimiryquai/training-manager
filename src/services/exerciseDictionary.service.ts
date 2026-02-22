import type { Kysely } from 'kysely';
import type { Database, MovementCategory, ExerciseType, BenchmarkUnit } from '../db/schema';

export interface CreateExerciseInput {
  tenant_id: string;
  name: string;
  movement_category: MovementCategory;
  progression_level: number;
  exercise_type: ExerciseType;
  benchmark_target?: string | null;
  master_exercise_id?: string | null;
  conversion_factor?: number | null;
}

export interface ExerciseDictionaryRecord {
  id: string;
  tenant_id: string;
  name: string;
  movement_category: MovementCategory;
  progression_level: number;
  exercise_type: ExerciseType;
  benchmark_target: string | null;
  master_exercise_id: string | null;
  conversion_factor: number | null;
}

export async function createExercise(
  db: Kysely<Database>,
  input: CreateExerciseInput
): Promise<ExerciseDictionaryRecord | undefined> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const result = await db
    .insertInto('exercise_dictionary')
    .values({
      id,
      tenant_id: input.tenant_id,
      name: input.name,
      movement_category: input.movement_category,
      progression_level: input.progression_level,
      exercise_type: input.exercise_type,
      benchmark_target: input.benchmark_target ?? null,
      master_exercise_id: input.master_exercise_id ?? null,
      conversion_factor: input.conversion_factor ?? null,
      created_at: now,
      updated_at: now,
    })
    .returningAll()
    .executeTakeFirst();

  return result;
}

export interface GetExercisesByCategoryInput {
  tenant_id: string;
  movement_category: MovementCategory;
}

export async function getExercisesByCategory(
  db: Kysely<Database>,
  input: GetExercisesByCategoryInput
): Promise<ExerciseDictionaryRecord[]> {
  return db
    .selectFrom('exercise_dictionary')
    .where('tenant_id', '=', input.tenant_id)
    .where('movement_category', '=', input.movement_category)
    .selectAll()
    .execute();
}

export interface GetExerciseByIdInput {
  tenant_id: string;
  id: string;
}

export async function getExerciseById(
  db: Kysely<Database>,
  input: GetExerciseByIdInput
): Promise<ExerciseDictionaryRecord | undefined> {
  return db
    .selectFrom('exercise_dictionary')
    .where('tenant_id', '=', input.tenant_id)
    .where('id', '=', input.id)
    .selectAll()
    .executeTakeFirst();
}

export interface GetExerciseWithMasterInput {
  tenant_id: string;
  id: string;
}

export interface ExerciseWithMaster extends ExerciseDictionaryRecord {
  master_exercise: ExerciseDictionaryRecord | null;
}

export async function getExerciseWithMaster(
  db: Kysely<Database>,
  input: GetExerciseWithMasterInput
): Promise<ExerciseWithMaster | undefined> {
  const exercise = await getExerciseById(db, input);

  if (!exercise) return undefined;
  if (!exercise.master_exercise_id) {
    return { ...exercise, master_exercise: null };
  }

  const masterExercise = await getExerciseById(db, {
    tenant_id: input.tenant_id,
    id: exercise.master_exercise_id,
  });

  return {
    ...exercise,
    master_exercise: masterExercise ?? null,
  };
}

export interface CreateUserBenchmarkInput {
  tenant_id: string;
  user_id: string;
  benchmark_name: string;
  benchmark_value?: number | null;
  benchmark_unit?: BenchmarkUnit | null;
  master_exercise_id?: string | null;
  one_rep_max_weight?: number | null;
}

export interface UserBenchmarkRecord {
  id: string;
  tenant_id: string;
  user_id: string;
  benchmark_name: string;
  benchmark_value: number | null;
  benchmark_unit: BenchmarkUnit | null;
  master_exercise_id: string | null;
  one_rep_max_weight: number | null;
}

export async function upsertUserBenchmark(
  db: Kysely<Database>,
  input: CreateUserBenchmarkInput
): Promise<UserBenchmarkRecord | undefined> {
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
        one_rep_max_weight: input.one_rep_max_weight ?? null,
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
      master_exercise_id: input.master_exercise_id ?? null,
      one_rep_max_weight: input.one_rep_max_weight ?? null,
      created_at: now,
      updated_at: now,
    })
    .returningAll()
    .executeTakeFirst();

  return result;
}

export interface GetExerciseByBenchmarkTargetInput {
  tenant_id: string;
  benchmark_target: string;
}

export async function getExercisesByBenchmarkTarget(
  db: Kysely<Database>,
  input: GetExerciseByBenchmarkTargetInput
): Promise<ExerciseDictionaryRecord[]> {
  return db
    .selectFrom('exercise_dictionary')
    .where('tenant_id', '=', input.tenant_id)
    .where('benchmark_target', '=', input.benchmark_target)
    .selectAll()
    .execute();
}
