import { calculateACWR } from "../services/acwr.service";
import { createWorkoutSession } from "../services/workoutSession.service";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import { env } from "cloudflare:workers";
import type { Database } from "../db/schema";
import type { CreateWorkoutSessionInput } from "../services/workoutSession.service";
import { libraryRouter } from "../trpc/routers/libraryRouter";
import type { MovementCategory, ExerciseType } from "../db/schema";

function getDb() {
    return new Kysely<Database>({
        dialect: new D1Dialect({ database: env.DB }),
    });
}

export async function test_calculateACWR(input: { tenant_id: string; date: string; }) {
    const db = getDb();
    return await calculateACWR(db, input);
}

export async function test_createWorkoutSession(input: CreateWorkoutSessionInput) {
    const db = getDb();
    return await createWorkoutSession(db, input);
}

// Ensure the db is clean for testing
export async function test_cleanDatabase(tenantId: string) {
    const db = getDb();
    await db.deleteFrom('workout_session').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('daily_wellness').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('exercise_dictionary').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('user_benchmarks').where('tenant_id', '=', tenantId).execute();
}

export async function test_library_addExercise(input: {
    tenant_id: string;
    name: string;
    movement_category: string;
    progression_level: number;
    exercise_type: string;
    master_exercise_id?: string;
    conversion_factor?: number;
}) {
    const db = getDb();
    const caller = libraryRouter.createCaller({
        session: { userId: 'test-user', tenantId: input.tenant_id },
        tenantId: input.tenant_id,
        userId: 'test-user',
        db
    });

    return await caller.addExercise({
        name: input.name,
        movement_category: input.movement_category as MovementCategory,
        progression_level: input.progression_level,
        exercise_type: input.exercise_type as ExerciseType,
        master_exercise_id: input.master_exercise_id,
        conversion_factor: input.conversion_factor,
    });
}

export async function test_library_getExercises(input: { tenant_id: string; movement_category: string; }) {
    const db = getDb();
    const caller = libraryRouter.createCaller({
        session: { userId: 'test-user', tenantId: input.tenant_id },
        tenantId: input.tenant_id,
        userId: 'test-user',
        db
    });
    return await caller.getExercisesByCategory({ movement_category: input.movement_category as MovementCategory });
}

export async function test_library_saveBenchmark(input: {
    tenant_id: string;
    benchmark_name: string;
    benchmark_value: number;
    benchmark_unit: string;
}) {
    const db = getDb();
    const caller = libraryRouter.createCaller({
        session: { userId: 'test-user', tenantId: input.tenant_id },
        tenantId: input.tenant_id,
        userId: 'test-user',
        db
    });
    return await caller.saveUserBenchmark({
        benchmark_name: input.benchmark_name,
        benchmark_value: input.benchmark_value,
        benchmark_unit: input.benchmark_unit as any,
    });
}
