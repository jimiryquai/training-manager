import {
    calculateACWR,
    calculateHistoricalACWR,
    getACWRTrendSummary
} from "../services/acwr.service";
import {
    getUserById,
    getUserByExternalAuthId,
    getUserByEmail,
    getUsersByTenant,
    updateUser,
    deactivateUser as deactivateUserService,
    reactivateUser as reactivateUserService,
    linkExternalAuth as linkExternalAuthService,
    deleteUser as deleteUserFromService,
} from "../services/user.service";
import {
    createWorkoutSession,
    createWorkoutSessionViaAgent,
    updateWorkoutSession,
    markWorkoutAsVoiceEntry,
    getWorkoutSessionById,
    getWorkoutSessionsByDateRange,
    deleteWorkoutSession
} from "../services/workoutSession.service";
import {
    createDailyWellness,
    createDailyWellnessViaAgent,
    updateDailyWellness,
    updateDailyWellnessViaAgent,
    deleteDailyWellness,
    deleteDailyWellnessByDate,
    getDailyWellnessByDate,
    getDailyWellnessByDateRange,
    getMostRecentWellness,
    getAverageWellnessScores
} from "../services/dailyWellness.service";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import { env } from "cloudflare:workers";
import type { Database } from "../db/schema";
import type { CreateWorkoutSessionInput, UpdateWorkoutSessionInput } from "../services/workoutSession.service";
import type {
    CreateDailyWellnessInput,
    UpdateDailyWellnessInput
} from "../services/dailyWellness.service";
import { libraryRouter } from "../trpc/routers/libraryRouter";
import { trainingSessionRouter } from "../trpc/routers/trainingSessionRouter";
import type { ExerciseType } from "../db/schema";

function getDb() {
    return new Kysely<Database>({
        dialect: new D1Dialect({ database: env.DB }),
    });
}

// ============================================================================
// User Test Utilities (needed for FK constraints)
// ============================================================================

export async function test_createUser(input: {
    id: string;
    email: string;
    tenant_id: string;
    role?: 'athlete' | 'admin';
}) {
    const db = getDb();
    const now = new Date().toISOString();

    return await db
        .insertInto('user')
        .values({
            id: input.id,
            email: input.email,
            tenant_id: input.tenant_id,
            role: input.role ?? 'athlete',
            is_active: 1,
            created_at: now,
            updated_at: now,
        })
        .returningAll()
        .executeTakeFirst();
}

export async function test_deleteUser(input: { id: string; tenant_id: string }) {
    const db = getDb();
    const result = await db
        .deleteFrom('user')
        .where('id', '=', input.id)
        .where('tenant_id', '=', input.tenant_id)
        .executeTakeFirst();
    return result.numDeletedRows > 0;
}

// ============================================================================
// ACWR Test Utilities
// ============================================================================

export async function test_calculateACWR(input: { tenant_id: string; date: string; user_id?: string; }) {
    const db = getDb();
    return await calculateACWR(db, input);
}

export async function test_calculateHistoricalACWR(input: {
    tenant_id: string;
    start_date: string;
    end_date: string;
    user_id?: string;
}) {
    const db = getDb();
    return await calculateHistoricalACWR(db, input);
}

export async function test_getACWRTrendSummary(input: {
    tenant_id: string;
    start_date: string;
    end_date: string;
    user_id?: string;
}) {
    const db = getDb();
    return await getACWRTrendSummary(db, input);
}

// ============================================================================
// Workout Session Test Utilities
// ============================================================================

export async function test_createWorkoutSession(input: CreateWorkoutSessionInput) {
    const db = getDb();
    return await createWorkoutSession(db, input);
}

export async function test_createWorkoutSessionViaAgent(input: {
    tenant_id: string;
    user_id: string;
    date: string;
    duration_minutes: number;
    srpe: number;
    planned_session_id?: string | null;
    agent_reasoning: string;
    completed_as_planned?: number;
}) {
    const db = getDb();
    return await createWorkoutSessionViaAgent(db, input);
}

export async function test_updateWorkoutSession(input: UpdateWorkoutSessionInput) {
    const db = getDb();
    return await updateWorkoutSession(db, input);
}

export async function test_markWorkoutAsVoiceEntry(input: {
    id: string;
    tenant_id: string;
    agent_reasoning: string;
    modifications: Record<string, unknown>;
}) {
    const db = getDb();
    return await markWorkoutAsVoiceEntry(db, input);
}

export async function test_getWorkoutSessionById(input: { id: string; tenant_id: string; }) {
    const db = getDb();
    return await getWorkoutSessionById(db, input);
}

export async function test_getWorkoutSessionsByDateRange(input: {
    tenant_id: string;
    start_date: string;
    end_date: string;
    user_id?: string;
}) {
    const db = getDb();
    return await getWorkoutSessionsByDateRange(db, input);
}

export async function test_deleteWorkoutSession(input: { id: string; tenant_id: string; }) {
    const db = getDb();
    return await deleteWorkoutSession(db, input);
}

// ============================================================================
// Daily Wellness Test Utilities
// ============================================================================

export async function test_createDailyWellness(input: CreateDailyWellnessInput) {
    const db = getDb();
    return await createDailyWellness(db, input);
}

export async function test_createDailyWellnessViaAgent(input: Omit<CreateDailyWellnessInput, 'data_source'>) {
    const db = getDb();
    return await createDailyWellnessViaAgent(db, input);
}

export async function test_updateDailyWellness(input: UpdateDailyWellnessInput) {
    const db = getDb();
    return await updateDailyWellness(db, input);
}

export async function test_updateDailyWellnessViaAgent(input: Omit<UpdateDailyWellnessInput, 'data_source'>) {
    const db = getDb();
    return await updateDailyWellnessViaAgent(db, input);
}

export async function test_deleteDailyWellness(input: { id: string; tenant_id: string; user_id?: string; }) {
    const db = getDb();
    return await deleteDailyWellness(db, input);
}

export async function test_deleteDailyWellnessByDate(input: {
    tenant_id: string;
    user_id: string;
    date: string;
}) {
    const db = getDb();
    return await deleteDailyWellnessByDate(db, input);
}

export async function test_getDailyWellnessByDate(input: {
    tenant_id: string;
    user_id: string;
    date: string;
}) {
    const db = getDb();
    return await getDailyWellnessByDate(db, input);
}

export async function test_getDailyWellnessByDateRange(input: {
    tenant_id: string;
    user_id: string;
    start_date: string;
    end_date: string;
}) {
    const db = getDb();
    return await getDailyWellnessByDateRange(db, input);
}

export async function test_getMostRecentWellness(input: { tenant_id: string; user_id: string; }) {
    const db = getDb();
    return await getMostRecentWellness(db, input);
}

export async function test_getAverageWellnessScores(input: {
    tenant_id: string;
    user_id: string;
    start_date: string;
    end_date: string;
}) {
    const db = getDb();
    return await getAverageWellnessScores(db, input);
}

// Ensure the db is clean for testing
export async function test_cleanDatabase(tenantId: string) {
    const db = getDb();
    // Delete in dependency order to respect FK constraints
    await db.deleteFrom('session_exercise').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('training_session').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('training_plan').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('workout_session').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('daily_wellness').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('user_benchmarks').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('exercise_dictionary').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('user').where('tenant_id', '=', tenantId).execute();
}

// ============================================================================
// User Service Test Utilities
// ============================================================================

export async function test_getUserById(input: { id: string; tenant_id?: string }) {
    const db = getDb();
    return await getUserById(db, input);
}

export async function test_getUserByExternalAuthId(input: { external_auth_id: string }) {
    const db = getDb();
    return await getUserByExternalAuthId(db, input);
}

export async function test_getUserByEmail(input: { email: string; tenant_id?: string }) {
    const db = getDb();
    return await getUserByEmail(db, input);
}

export async function test_getUsersByTenant(input: { tenant_id: string; is_active?: number }) {
    const db = getDb();
    return await getUsersByTenant(db, input);
}

export async function test_updateUser(input: {
    id: string;
    tenant_id?: string;
    email?: string;
    external_auth_id?: string | null;
    role?: 'athlete' | 'admin';
    is_active?: number;
    display_name?: string | null;
}) {
    const db = getDb();
    return await updateUser(db, input);
}

export async function test_deactivateUser(input: { id: string; tenant_id?: string }) {
    const db = getDb();
    return await deactivateUserService(db, input);
}

export async function test_reactivateUser(input: { id: string; tenant_id?: string }) {
    const db = getDb();
    return await reactivateUserService(db, input);
}

export async function test_linkExternalAuth(input: {
    user_id: string;
    external_auth_id: string;
    tenant_id?: string;
}) {
    const db = getDb();
    return await linkExternalAuthService(db, input);
}

export async function test_library_addExercise(input: {
    tenant_id: string;
    name: string;
    movement_category: string;
    exercise_type: string;
    benchmark_target?: string;
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
        movement_category: input.movement_category,
        exercise_type: input.exercise_type as ExerciseType,
        benchmark_target: input.benchmark_target,
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
    return await caller.getExercisesByCategory({ movement_category: input.movement_category });
}

export async function test_library_saveBenchmark(input: {
    tenant_id: string;
    benchmark_name: string;
    benchmark_value: number;
    benchmark_unit: string;
    training_max_percentage?: number;
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
        training_max_percentage: input.training_max_percentage,
    });
}

export async function test_library_updateExercise(input: {
    tenant_id: string;
    id: string;
    name?: string;
    movement_category?: string;
    exercise_type?: string;
    benchmark_target?: string | null;
    conversion_factor?: number | null;
}) {
    const db = getDb();
    const caller = libraryRouter.createCaller({
        session: { userId: 'test-user', tenantId: input.tenant_id },
        tenantId: input.tenant_id,
        userId: 'test-user',
        db
    });
    return await caller.updateExercise({
        id: input.id,
        name: input.name,
        movement_category: input.movement_category,
        exercise_type: input.exercise_type as ExerciseType,
        benchmark_target: input.benchmark_target,
        conversion_factor: input.conversion_factor,
    });
}

export async function test_library_deleteExercise(input: {
    tenant_id: string;
    id: string;
}) {
    const db = getDb();
    const caller = libraryRouter.createCaller({
        session: { userId: 'test-user', tenantId: input.tenant_id },
        tenantId: input.tenant_id,
        userId: 'test-user',
        db
    });
    return await caller.deleteExercise({ id: input.id });
}

export async function test_library_getExercisesByBenchmark(input: {
    tenant_id: string;
    benchmark_target: string;
}) {
    const db = getDb();
    const caller = libraryRouter.createCaller({
        session: { userId: 'test-user', tenantId: input.tenant_id },
        tenantId: input.tenant_id,
        userId: 'test-user',
        db
    });
    return await caller.getExercisesByBenchmark({ benchmark_target: input.benchmark_target });
}

export async function test_library_getSystemExercises(input: { tenant_id: string }) {
    const db = getDb();
    const caller = libraryRouter.createCaller({
        session: { userId: 'test-user', tenantId: input.tenant_id },
        tenantId: input.tenant_id,
        userId: 'test-user',
        db
    });
    return await caller.getSystemExercises();
}

export async function test_library_getUserBenchmark(input: {
    tenant_id: string;
    benchmark_name: string;
}) {
    const db = getDb();
    const caller = libraryRouter.createCaller({
        session: { userId: 'test-user', tenantId: input.tenant_id },
        tenantId: input.tenant_id,
        userId: 'test-user',
        db
    });
    return await caller.getUserBenchmark({ benchmark_name: input.benchmark_name });
}

export async function test_library_getUserBenchmarks(input: { tenant_id: string }) {
    const db = getDb();
    const caller = libraryRouter.createCaller({
        session: { userId: 'test-user', tenantId: input.tenant_id },
        tenantId: input.tenant_id,
        userId: 'test-user',
        db
    });
    return await caller.getUserBenchmarks();
}

export async function test_library_getTrainingMaxForExercise(input: {
    tenant_id: string;
    exercise_id: string;
}) {
    const db = getDb();
    const caller = libraryRouter.createCaller({
        session: { userId: 'test-user', tenantId: input.tenant_id },
        tenantId: input.tenant_id,
        userId: 'test-user',
        db
    });
    return await caller.getTrainingMaxForExercise({ exercise_id: input.exercise_id });
}

// ============================================================================
// Training Plan Test Utilities (for CoachAgent tools)
// ============================================================================

export async function test_createTrainingPlan(input: {
    tenant_id: string | null;
    name: string;
    is_system_template?: number;
}) {
    const db = getDb();
    const { createTrainingPlan } = await import('../services/trainingPlan.service');
    return await createTrainingPlan(db, input);
}

export async function test_getFullTrainingPlan(input: { id: string; tenant_id?: string | null }) {
    const db = getDb();
    const { getFullTrainingPlan } = await import('../services/trainingPlan.service');
    return await getFullTrainingPlan(db, input);
}

export async function test_getTrainingPlansForTenant(tenant_id: string) {
    const db = getDb();
    const { getTrainingPlansForTenant } = await import('../services/trainingPlan.service');
    return await getTrainingPlansForTenant(db, tenant_id);
}

export async function test_createTrainingSession(input: {
    tenant_id: string;
    plan_id: string;
    block_name?: string | null;
    week_number?: number | null;
    day_of_week?: string | null;
    session_name?: string | null;
}) {
    const db = getDb();
    const { createTrainingSession } = await import('../services/trainingSession.service');
    return await createTrainingSession(db, input);
}

export async function test_getTrainingSessionsByPlan(plan_id: string) {
    const db = getDb();
    const { getTrainingSessionsByPlan } = await import('../services/trainingSession.service');
    return await getTrainingSessionsByPlan(db, { plan_id });
}

export async function test_getTrainingPlanById(input: { id: string; tenant_id?: string | null }) {
    const db = getDb();
    const { getTrainingPlanById } = await import('../services/trainingPlan.service');
    return await getTrainingPlanById(db, input);
}

export async function test_getTrainingSessionById(input: { id: string; tenant_id?: string | null }) {
    const db = getDb();
    const { getTrainingSessionById } = await import('../services/trainingSession.service');
    return await getTrainingSessionById(db, input);
}

export async function test_getTrainingSessionsByWeek(input: { plan_id: string; week_number: number }) {
    const db = getDb();
    const { getTrainingSessionsByWeek } = await import('../services/trainingSession.service');
    return await getTrainingSessionsByWeek(db, input);
}

export async function test_createSessionExercise(input: {
    tenant_id: string | null;
    session_id: string;
    exercise_dictionary_id: string;
    circuit_group?: string | null;
    order_in_session: number;
    scheme_name?: string | null;
    target_sets?: number | null;
    target_reps?: string | null;
    target_intensity?: number | null;
    target_rpe?: number | null;
    target_tempo?: string | null;
    target_rest_seconds?: number | null;
    coach_notes?: string | null;
}) {
    const db = getDb();
    const { createSessionExercise } = await import('../services/sessionExercise.service');
    return await createSessionExercise(db, input);
}

export async function test_getSessionExercisesBySession(input: { session_id: string }) {
    const db = getDb();
    const { getSessionExercisesBySession } = await import('../services/sessionExercise.service');
    return await getSessionExercisesBySession(db, input);
}

export async function test_getSessionExerciseById(input: { id: string; tenant_id?: string | null }) {
    const db = getDb();
    const { getSessionExerciseById } = await import('../services/sessionExercise.service');
    return await getSessionExerciseById(db, input);
}

export async function test_cleanTrainingPlanData(tenantId: string) {
    const db = getDb();
    // Delete in dependency order: exercises -> sessions -> plans
    await db.deleteFrom('session_exercise').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('training_session').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('training_plan').where('tenant_id', '=', tenantId).execute();
}

export async function test_createExercise(input: {
    tenant_id: string | null;
    name: string;
    movement_category: string;
    exercise_type: string;
    benchmark_target?: string | null;
    conversion_factor?: number | null;
}) {
    const db = getDb();
    const { createExercise } = await import('../services/exerciseDictionary.service');
    return await createExercise(db, input as any);
}

// ============================================================================
// User Benchmark Test Utilities (for CoachAgent tools)
// ============================================================================

export async function test_getUserBenchmarks(input: { tenant_id: string; user_id: string }) {
    const db = getDb();
    return await db
        .selectFrom('user_benchmarks')
        .where('tenant_id', '=', input.tenant_id)
        .where('user_id', '=', input.user_id)
        .selectAll()
        .execute();
}

export async function test_upsertUserBenchmark(input: {
    tenant_id: string;
    user_id: string;
    benchmark_name: string;
    benchmark_value: number;
    benchmark_unit?: string;
}) {
    const db = getDb();
    const now = new Date().toISOString();
    const unit = (input.benchmark_unit || 'kg') as 'kg' | 'lbs' | 'seconds' | 'reps' | 'meters';

    // Try update first
    const updated = await db
        .updateTable('user_benchmarks')
        .set({
            benchmark_value: input.benchmark_value,
            benchmark_unit: unit,
            updated_at: now,
        })
        .where('tenant_id', '=', input.tenant_id)
        .where('user_id', '=', input.user_id)
        .where('benchmark_name', '=', input.benchmark_name)
        .returningAll()
        .executeTakeFirst();

    if (updated) {
        return updated;
    }

    // Insert if not found
    return await db
        .insertInto('user_benchmarks')
        .values({
            id: crypto.randomUUID(),
            tenant_id: input.tenant_id,
            user_id: input.user_id,
            benchmark_name: input.benchmark_name,
            benchmark_value: input.benchmark_value,
            benchmark_unit: unit,
            created_at: now,
            updated_at: now,
        })
        .returningAll()
        .executeTakeFirst();
}

// ============================================================================
// Exercise Dictionary Test Utilities
// ============================================================================

export async function test_getExerciseById(input: { id: string; tenant_id?: string | null }) {
    const db = getDb();
    const { getExerciseById } = await import('../services/exerciseDictionary.service');
    return await getExerciseById(db, input);
}

export async function test_getExercisesByCategory(input: { tenant_id: string | null; movement_category: string }) {
    const db = getDb();
    const { getExercisesByCategory } = await import('../services/exerciseDictionary.service');
    return await getExercisesByCategory(db, input);
}

export async function test_getExercisesByBenchmarkTarget(input: { benchmark_target: string; tenant_id?: string | null }) {
    const db = getDb();
    const { getExercisesByBenchmarkTarget } = await import('../services/exerciseDictionary.service');
    return await getExercisesByBenchmarkTarget(db, input);
}

export async function test_getSystemExercises() {
    const db = getDb();
    const { getSystemExercises } = await import('../services/exerciseDictionary.service');
    return await getSystemExercises(db);
}

export async function test_getExercisesForTenant(tenant_id: string) {
    const db = getDb();
    const { getExercisesForTenant } = await import('../services/exerciseDictionary.service');
    return await getExercisesForTenant(db, tenant_id);
}

export async function test_updateExercise(input: {
    id: string;
    tenant_id: string | null;
    name?: string;
    movement_category?: string;
    exercise_type?: string;
    benchmark_target?: string | null;
    conversion_factor?: number | null;
}) {
    const db = getDb();
    const { updateExercise } = await import('../services/exerciseDictionary.service');
    return await updateExercise(db, input as any);
}

export async function test_deleteExercise(input: { id: string; tenant_id: string | null }) {
    const db = getDb();
    const { deleteExercise } = await import('../services/exerciseDictionary.service');
    return await deleteExercise(db, input);
}

export async function test_createUserBenchmark(input: {
    tenant_id: string;
    user_id: string;
    benchmark_name: string;
    benchmark_value?: number | null;
    benchmark_unit?: string | null;
    training_max_percentage?: number;
}) {
    const db = getDb();
    const { createUserBenchmark } = await import('../services/exerciseDictionary.service');
    return await createUserBenchmark(db, input as any);
}

export async function test_getUserBenchmark(input: { tenant_id: string; user_id: string; benchmark_name: string }) {
    const db = getDb();
    const { getUserBenchmark } = await import('../services/exerciseDictionary.service');
    return await getUserBenchmark(db, input);
}

export async function test_updateUserBenchmark(input: {
    id: string;
    tenant_id: string;
    user_id?: string;
    benchmark_name?: string;
    benchmark_value?: number | null;
    benchmark_unit?: string | null;
    training_max_percentage?: number;
}) {
    const db = getDb();
    const { updateUserBenchmark } = await import('../services/exerciseDictionary.service');
    return await updateUserBenchmark(db, input as any);
}

export async function test_deleteUserBenchmark(input: { id: string; tenant_id: string; user_id?: string }) {
    const db = getDb();
    const { deleteUserBenchmark } = await import('../services/exerciseDictionary.service');
    return await deleteUserBenchmark(db, input);
}

export async function test_deleteUserBenchmarkByName(input: { tenant_id: string; user_id: string; benchmark_name: string }) {
    const db = getDb();
    const { deleteUserBenchmarkByName } = await import('../services/exerciseDictionary.service');
    return await deleteUserBenchmarkByName(db, input);
}

export async function test_getUserBenchmarkById(input: { id: string; tenant_id: string; user_id?: string }) {
    const db = getDb();
    const { getUserBenchmarkById } = await import('../services/exerciseDictionary.service');
    return await getUserBenchmarkById(db, input);
}

export async function test_calculateTrainingMax(input: {
    benchmark_value: number;
    training_max_percentage: number;
}) {
    const { calculateTrainingMax } = await import('../services/exerciseDictionary.service');
    // Build a minimal benchmark record
    const benchmark = {
        id: 'test-benchmark',
        tenant_id: 'test-tenant',
        user_id: 'test-user',
        benchmark_name: 'test',
        benchmark_value: input.benchmark_value,
        benchmark_unit: 'kg' as const,
        training_max_percentage: input.training_max_percentage,
    };
    return calculateTrainingMax(benchmark);
}

export async function test_getTrainingMaxForExercise(input: {
    tenant_id: string;
    user_id: string;
    exercise_id: string;
}) {
    const db = getDb();
    const { getTrainingMaxForExercise } = await import('../services/exerciseDictionary.service');
    return await getTrainingMaxForExercise(db, input);
}

// ============================================================================
// Error Handling Test Utilities
// ============================================================================

export async function test_createServiceError(input: { code: string; message: string; cause?: unknown }) {
    const { ServiceError } = await import('../services/errors');
    const error = new ServiceError(
        input.code as 'NOT_FOUND' | 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'DATABASE_ERROR',
        input.message,
        input.cause
    );
    return {
        name: error.name,
        code: error.code,
        message: error.message,
        cause: error.cause,
    };
}

export async function test_wrapDatabaseError_success() {
    const { wrapDatabaseError } = await import('../services/errors');
    const result = await wrapDatabaseError('testOp', async () => 42);
    return result;
}

export async function test_wrapDatabaseError_wrapsUnknown() {
    const { wrapDatabaseError, ServiceError } = await import('../services/errors');
    try {
        await wrapDatabaseError('insertRecord', async () => {
            throw new Error('sqlite: disk I/O error');
        });
        return { threw: false };
    } catch (error: unknown) {
        if (error instanceof ServiceError) {
            return {
                threw: true,
                name: error.name,
                code: error.code,
                message: error.message,
                causeMessage: error.cause instanceof Error ? error.cause.message : String(error.cause),
            };
        }
        return { threw: true, unexpectedError: String(error) };
    }
}

export async function test_wrapDatabaseError_passesThroughServiceError() {
    const { wrapDatabaseError, ServiceError } = await import('../services/errors');
    const originalError = new ServiceError('NOT_FOUND', 'Record not found');
    try {
        await wrapDatabaseError('testOp', async () => {
            throw originalError;
        });
        return { threw: false };
    } catch (error: unknown) {
        if (error instanceof ServiceError) {
            return {
                threw: true,
                isSameObject: error === originalError,
                code: error.code,
                message: error.message,
            };
        }
        return { threw: true, unexpectedError: String(error) };
    }
}

export async function test_wrapDatabaseError_wrapsNonError() {
    const { wrapDatabaseError, ServiceError } = await import('../services/errors');
    try {
        await wrapDatabaseError('testOp', async () => {
            throw 'string error';
        });
        return { threw: false };
    } catch (error: unknown) {
        if (error instanceof ServiceError) {
            return {
                threw: true,
                code: error.code,
                message: error.message,
                cause: String(error.cause),
            };
        }
        return { threw: true, unexpectedError: String(error) };
    }
}

export async function test_createDailyWellnessInvalid() {
    const db = getDb();
    const { createDailyWellness } = await import('../services/dailyWellness.service');
    // Trigger a DB error by using empty strings for required fields
    return await createDailyWellness(db, {
        tenant_id: '',
        user_id: '',
        date: '',
        rhr: 55,
        hrv_rmssd: 45,
    });
}

export async function test_getWorkoutSessionInvalid() {
    const db = getDb();
    const { getWorkoutSessionById } = await import('../services/workoutSession.service');
    // This should return undefined for non-existent ID
    return await getWorkoutSessionById(db, { id: 'non-existent-uuid', tenant_id: 'non-existent-tenant' });
}

export async function test_upsertDailyWellness(input: {
    tenant_id: string;
    user_id: string;
    date: string;
    rhr: number;
    hrv_rmssd: number;
    sleep_score?: number | null;
    fatigue_score?: number | null;
}) {
    const db = getDb();
    const { upsertDailyWellness } = await import('../services/dailyWellness.service');
    return await upsertDailyWellness(db, input);
}

// ============================================================================
// CoachAgent State Management Test Utilities
// ============================================================================

/**
 * Validate CoachAgent state structure
 * This tests the state shape without needing a real agent instance
 */
export function test_validateCoachAgentState(state: unknown): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (typeof state !== 'object' || state === null) {
        return { valid: false, errors: ['State must be an object'] };
    }

    const s = state as Record<string, unknown>;

    if (typeof s.userId !== 'string') {
        errors.push('userId must be a string');
    }
    if (typeof s.tenantId !== 'string') {
        errors.push('tenantId must be a string');
    }
    if (!['supportive', 'analytical', 'intense', 'recovery'].includes(s.personaMode as string)) {
        errors.push('personaMode must be one of: supportive, analytical, intense, recovery');
    }
    if (typeof s.lastInteractionAt !== 'string') {
        errors.push('lastInteractionAt must be an ISO string');
    }
    if (typeof s.sessionContext !== 'object' || s.sessionContext === null) {
        errors.push('sessionContext must be an object');
    } else {
        const ctx = s.sessionContext as Record<string, unknown>;
        if (ctx.currentPlanId !== undefined && typeof ctx.currentPlanId !== 'string') {
            errors.push('sessionContext.currentPlanId must be a string if present');
        }
        if (ctx.currentWeek !== undefined && typeof ctx.currentWeek !== 'number') {
            errors.push('sessionContext.currentWeek must be a number if present');
        }
        if (!Array.isArray(ctx.activeGoals)) {
            errors.push('sessionContext.activeGoals must be an array');
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Get the default CoachAgent state
 */
export function test_getDefaultCoachAgentState(): {
    userId: string;
    tenantId: string;
    personaMode: 'supportive' | 'analytical' | 'intense' | 'recovery';
    lastInteractionAt: string;
    sessionContext: {
        currentPlanId?: string;
        currentWeek?: number;
        activeGoals: string[];
    };
} {
    return {
        userId: '',
        tenantId: '',
        personaMode: 'supportive',
        lastInteractionAt: new Date().toISOString(),
        sessionContext: { activeGoals: [] },
    };
}

/**
 * Simulate persona change (state update)
 */
export function test_setPersona(
    currentState: Record<string, unknown>,
    persona: string
): Record<string, unknown> {
    const validPersonas = ['supportive', 'analytical', 'intense', 'recovery'];
    if (!validPersonas.includes(persona)) {
        throw new Error(`Invalid persona: ${persona}. Must be one of: ${validPersonas.join(', ')}`);
    }
    return {
        ...currentState,
        personaMode: persona,
        lastInteractionAt: new Date().toISOString(),
    };
}

// ============================================================================
// CoachAgent AI Provider Test Utilities
// ============================================================================

/**
 * Persona prompt definitions (mirrors CoachAgent.getPersonaPrompt())
 * This allows testing persona content without a real agent instance
 */
export const PERSONA_PROMPTS: Record<'supportive' | 'analytical' | 'intense' | 'recovery', string> = {
    supportive: `You are a supportive, encouraging fitness coach. Celebrate wins, offer gentle guidance on setbacks, and keep the athlete motivated. Be warm and personable. Focus on building confidence and sustainable habits.`,
    analytical: `You are a data-driven performance coach. Focus on metrics, trends, and evidence-based recommendations. Be precise and thorough in your analysis. Help the athlete understand the numbers behind their training.`,
    intense: `You are a no-nonsense, high-performance coach. Push the athlete hard, demand accountability, and expect maximum effort. Be direct and challenging. Help them break through plateaus.`,
    recovery: `You are a recovery and wellness focused coach. Prioritize rest, stress management, and sustainable training. Be calming and restorative. Help the athlete understand the importance of recovery for long-term success.`,
};

/**
 * Get the persona prompt for a given persona mode
 */
export function test_getPersonaPrompt(persona: string): string {
    const validPersonas = ['supportive', 'analytical', 'intense', 'recovery'];
    if (!validPersonas.includes(persona)) {
        throw new Error(`Invalid persona: ${persona}. Must be one of: ${validPersonas.join(', ')}`);
    }
    return PERSONA_PROMPTS[persona as keyof typeof PERSONA_PROMPTS];
}

/**
 * Validate persona prompt content requirements
 */
export function test_validatePersonaPrompt(prompt: string, persona: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check minimum length
    if (prompt.length < 50) {
        errors.push(`Prompt is too short (${prompt.length} chars). Expected at least 50 characters.`);
    }

    // Check maximum length (prevent runaway prompts)
    if (prompt.length > 2000) {
        warnings.push(`Prompt is very long (${prompt.length} chars). Consider shortening for efficiency.`);
    }

    // Persona-specific validation
    const personaKeywords: Record<string, string[]> = {
        supportive: ['encouraging', 'supportive', 'motivated', 'confidence', 'warm'],
        analytical: ['data', 'metrics', 'trends', 'evidence', 'analysis', 'numbers'],
        intense: ['performance', 'accountability', 'effort', 'challenging', 'plateaus'],
        recovery: ['rest', 'recovery', 'wellness', 'stress', 'sustainable', 'calming'],
    };

    const keywords = personaKeywords[persona];
    if (keywords) {
        const lowerPrompt = prompt.toLowerCase();
        const foundKeywords = keywords.filter(kw => lowerPrompt.includes(kw));
        if (foundKeywords.length < 2) {
            warnings.push(
                `Prompt may not match ${persona} persona well. Found only ${foundKeywords.length}/${keywords.length} expected keywords: ${foundKeywords.join(', ')}`
            );
        }
    }

    // Check for role definition
    if (!prompt.toLowerCase().includes('you are') && !prompt.toLowerCase().includes('you\'re')) {
        errors.push('Prompt should define the AI role (e.g., "You are a...")');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Determine which AI provider would be used based on config
 */
export function test_getAIProviderConfig(env: { OPENAI_API_KEY?: string }): {
    provider: 'openai' | 'workers-ai';
    model: string;
    isPremium: boolean;
} {
    if (env.OPENAI_API_KEY) {
        return {
            provider: 'openai',
            model: 'gpt-4o-mini',
            isPremium: true,
        };
    }
    return {
        provider: 'workers-ai',
        model: '@cf/meta/llama-3.1-8b-instruct',
        isPremium: false,
    };
}

/**
 * Validate conversation message structure for AI context
 */
export function test_validateConversationMessage(message: {
    role: string;
    content: string;
}): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!['user', 'assistant', 'system'].includes(message.role)) {
        errors.push(`Invalid role: ${message.role}. Must be 'user', 'assistant', or 'system'.`);
    }

    if (typeof message.content !== 'string') {
        errors.push('Content must be a string.');
    } else if (message.content.length === 0) {
        errors.push('Content cannot be empty.');
    } else if (message.content.length > 100000) {
        errors.push('Content is too long (max 100,000 characters).');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Build conversation history context for AI (simulates agent behavior)
 */
export function test_buildConversationContext(
    messages: Array<{ role: string; content: string }>,
    limit: number = 10
): Array<{ role: 'user' | 'assistant'; content: string }> {
    // Take last N messages, filter to user/assistant only
    const filtered = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-limit);

    return filtered.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
    }));
}

// ==============================================================================
// WebSocket Session Validation Test Utilities
// ==============================================================================

/**
 * Convert ArrayBuffer to hex string (mirrors CoachAgent implementation)
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
    const array = new Uint8Array(buffer);
    return Array.from(array)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Sign a session ID using HMAC-SHA256 (mirrors CoachAgent implementation)
 */
export async function test_signSessionId(unsignedSessionId: string, secretKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secretKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signatureArrayBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(unsignedSessionId));
    return arrayBufferToHex(signatureArrayBuffer);
}

/**
 * Pack session ID with signature into base64 format
 */
export function test_packSessionId(unsignedSessionId: string, signature: string): string {
    return btoa(`${unsignedSessionId}:${signature}`);
}

/**
 * Create a signed session cookie value for WebSocket testing
 * Returns the full cookie value ready to be set in Cookie header
 */
export async function test_createSignedSessionCookie(
    sessionId: string,
    secretKey: string
): Promise<string> {
    const signature = await test_signSessionId(sessionId, secretKey);
    const packed = test_packSessionId(sessionId, signature);
    return `session_id=${packed}`;
}

/**
 * Validate a signed session cookie (mirrors CoachAgent validation logic)
 */
export async function test_validateSignedSession(
    packedSessionId: string,
    secretKey: string
): Promise<{ valid: boolean; unsignedSessionId: string | null }> {
    try {
        const decoded = atob(packedSessionId);
        const [unsignedSessionId, signature] = decoded.split(':');
        
        if (!unsignedSessionId || !signature) {
            return { valid: false, unsignedSessionId: null };
        }
        
        const computedSignature = await test_signSessionId(unsignedSessionId, secretKey);
        
        if (computedSignature !== signature) {
            return { valid: false, unsignedSessionId: null };
        }
        
        return { valid: true, unsignedSessionId };
    } catch {
        return { valid: false, unsignedSessionId: null };
    }
}

/**
 * Extract session_id from cookie header (mirrors CoachAgent implementation)
 */
export function test_extractSessionId(cookieHeader: string): string | null {
    for (const cookie of cookieHeader.split(';')) {
        const trimmedCookie = cookie.trim();
        const separatorIndex = trimmedCookie.indexOf('=');
        if (separatorIndex === -1) continue;
        const key = trimmedCookie.slice(0, separatorIndex);
        const value = trimmedCookie.slice(separatorIndex + 1);
        if (key === 'session_id') {
            return value;
        }
    }
    return null;
}

// ============================================================================
// Training Session Router Test Utilities
// ============================================================================

function createSessionCaller(tenantId: string, userId: string = 'test-user') {
    const db = getDb();
    return trainingSessionRouter.createCaller({
        session: { userId, tenantId },
        tenantId,
        userId,
        db,
    });
}

export async function test_ts_createSession(input: {
    tenant_id: string;
    plan_id: string;
    block_name?: string;
    week_number?: number;
    day_of_week?: string;
    session_name?: string;
}) {
    const caller = createSessionCaller(input.tenant_id);
    return await caller.createSession({
        plan_id: input.plan_id,
        block_name: input.block_name,
        week_number: input.week_number,
        day_of_week: input.day_of_week,
        session_name: input.session_name,
    });
}

export async function test_ts_getSession(input: { tenant_id: string; id: string }) {
    const caller = createSessionCaller(input.tenant_id);
    return await caller.getSession({ id: input.id });
}

export async function test_ts_getSessionsByPlan(input: { tenant_id: string; plan_id: string }) {
    const caller = createSessionCaller(input.tenant_id);
    return await caller.getSessionsByPlan({ plan_id: input.plan_id });
}

export async function test_ts_getSessionsByWeek(input: { tenant_id: string; plan_id: string; week_number: number }) {
    const caller = createSessionCaller(input.tenant_id);
    return await caller.getSessionsByWeek({ plan_id: input.plan_id, week_number: input.week_number });
}

export async function test_ts_updateSession(input: {
    tenant_id: string;
    id: string;
    block_name?: string | null;
    week_number?: number | null;
    day_of_week?: string | null;
    session_name?: string | null;
}) {
    const caller = createSessionCaller(input.tenant_id);
    return await caller.updateSession({
        id: input.id,
        block_name: input.block_name,
        week_number: input.week_number,
        day_of_week: input.day_of_week,
        session_name: input.session_name,
    });
}

export async function test_ts_deleteSession(input: { tenant_id: string; id: string }) {
    const caller = createSessionCaller(input.tenant_id);
    return await caller.deleteSession({ id: input.id });
}

export async function test_ts_getFullSession(input: { tenant_id: string; id: string }) {
    const caller = createSessionCaller(input.tenant_id);
    return await caller.getFullSession({ id: input.id });
}

export async function test_ts_createExercise(input: {
    tenant_id: string;
    session_id: string;
    exercise_dictionary_id: string;
    circuit_group?: string;
    order_in_session: number;
    scheme_name?: string;
    coach_notes?: string;
}) {
    const caller = createSessionCaller(input.tenant_id);
    return await caller.createExercise({
        session_id: input.session_id,
        exercise_dictionary_id: input.exercise_dictionary_id,
        circuit_group: input.circuit_group,
        order_in_session: input.order_in_session,
        scheme_name: input.scheme_name,
        coach_notes: input.coach_notes,
    });
}

export async function test_ts_getExercise(input: { tenant_id: string; id: string }) {
    const caller = createSessionCaller(input.tenant_id);
    return await caller.getExercise({ id: input.id });
}

export async function test_ts_getExercisesBySession(input: { tenant_id: string; session_id: string }) {
    const caller = createSessionCaller(input.tenant_id);
    return await caller.getExercisesBySession({ session_id: input.session_id });
}

export async function test_ts_getExercisesGrouped(input: { tenant_id: string; session_id: string }) {
    const caller = createSessionCaller(input.tenant_id);
    return await caller.getExercisesGrouped({ session_id: input.session_id });
}

export async function test_ts_updateExercise(input: {
    tenant_id: string;
    id: string;
    circuit_group?: string | null;
    order_in_session?: number;
    scheme_name?: string | null;
    coach_notes?: string | null;
}) {
    const caller = createSessionCaller(input.tenant_id);
    return await caller.updateExercise({
        id: input.id,
        circuit_group: input.circuit_group,
        order_in_session: input.order_in_session,
        scheme_name: input.scheme_name,
        coach_notes: input.coach_notes,
    });
}

export async function test_ts_deleteExercise(input: { tenant_id: string; id: string }) {
    const caller = createSessionCaller(input.tenant_id);
    return await caller.deleteExercise({ id: input.id });
}

// ============================================================================
// CORS Test Utilities (for tRPC handler)
// ============================================================================

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Test OPTIONS preflight request to verify CORS headers
 */
export async function test_corsOptionsPreflight(): Promise<{
    status: number;
    headers: Record<string, string>;
}> {
    const { createTRPCHandler } = await import('../trpc/handler');
    const { env } = await import('cloudflare:workers');
    
    const db = getDb();
    const mockSessionStore = {
        load: async () => null,
    };
    
    const handler = createTRPCHandler({
        sessionStore: mockSessionStore as any,
        db,
    });
    
    const request = new Request('http://localhost/trpc/test', {
        method: 'OPTIONS',
    });
    
    const response = await handler(request);
    
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
        headers[key] = value;
    });
    
    return {
        status: response.status,
        headers,
    };
}

/**
 * Test POST request to verify CORS headers are added to response
 */
export async function test_corsPostRequest(input: {
    body: string;
    contentType?: string;
}): Promise<{
    status: number;
    headers: Record<string, string>;
}> {
    const { createTRPCHandler } = await import('../trpc/handler');
    
    const db = getDb();
    const mockSessionStore = {
        load: async () => null,
    };
    
    const handler = createTRPCHandler({
        sessionStore: mockSessionStore as any,
        db,
    });
    
    const request = new Request('http://localhost/trpc/healthcheck', {
        method: 'POST',
        headers: {
            'Content-Type': input.contentType ?? 'application/json',
        },
        body: input.body,
    });
    
    const response = await handler(request);
    
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
        headers[key] = value;
    });
    
    return {
        status: response.status,
        headers,
    };
}

/**
 * Verify CORS headers are present and correct
 */
export function test_verifyCORSHeaders(headers: Record<string, string>): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];
    
    // Check Access-Control-Allow-Origin
    if (headers['access-control-allow-origin'] !== CORS_HEADERS['Access-Control-Allow-Origin']) {
        errors.push(`Expected Access-Control-Allow-Origin '${CORS_HEADERS['Access-Control-Allow-Origin']}', got '${headers['access-control-allow-origin']}'`);
    }
    
    // Check Access-Control-Allow-Methods
    if (headers['access-control-allow-methods'] !== CORS_HEADERS['Access-Control-Allow-Methods']) {
        errors.push(`Expected Access-Control-Allow-Methods '${CORS_HEADERS['Access-Control-Allow-Methods']}', got '${headers['access-control-allow-methods']}'`);
    }
    
    // Check Access-Control-Allow-Headers
    if (headers['access-control-allow-headers'] !== CORS_HEADERS['Access-Control-Allow-Headers']) {
        errors.push(`Expected Access-Control-Allow-Headers '${CORS_HEADERS['Access-Control-Allow-Headers']}', got '${headers['access-control-allow-headers']}'`);
    }
    
    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Get expected CORS headers for comparison
 */
export function test_getExpectedCORSHeaders(): Record<string, string> {
    return { ...CORS_HEADERS };
}

// ============================================================================
// Training Plan Router Test Utilities
// ============================================================================

import { trainingPlanRouter } from '../trpc/routers/trainingPlanRouter';

/**
 * Create a caller for the training plan router with proper context
 */
function createTrainingPlanCaller(tenantId: string, userId: string = 'test-user') {
    const db = getDb();
    return trainingPlanRouter.createCaller({
        session: { userId, tenantId },
        tenantId,
        userId,
        db,
    });
}

export async function test_tp_createPlan(input: {
    tenant_id: string;
    name: string;
    is_system_template?: boolean;
}) {
    const caller = createTrainingPlanCaller(input.tenant_id);
    return await caller.createPlan({
        name: input.name,
        is_system_template: input.is_system_template,
    });
}

export async function test_tp_getPlan(input: { tenant_id: string; id: string }) {
    const caller = createTrainingPlanCaller(input.tenant_id);
    return await caller.getPlan({ id: input.id });
}

export async function test_tp_getSystemPlans(input: { tenant_id: string }) {
    const caller = createTrainingPlanCaller(input.tenant_id);
    return await caller.getSystemPlans();
}

export async function test_tp_getPlansForTenant(input: { tenant_id: string }) {
    const caller = createTrainingPlanCaller(input.tenant_id);
    return await caller.getPlansForTenant();
}

export async function test_tp_updatePlan(input: {
    tenant_id: string;
    id: string;
    name?: string;
}) {
    const caller = createTrainingPlanCaller(input.tenant_id);
    return await caller.updatePlan({
        id: input.id,
        name: input.name,
    });
}

export async function test_tp_deletePlan(input: { tenant_id: string; id: string }) {
    const caller = createTrainingPlanCaller(input.tenant_id);
    return await caller.deletePlan({ id: input.id });
}

export async function test_tp_clonePlan(input: {
    tenant_id: string;
    plan_id: string;
    new_name?: string;
}) {
    const caller = createTrainingPlanCaller(input.tenant_id);
    return await caller.clonePlan({
        plan_id: input.plan_id,
        new_name: input.new_name,
    });
}

export async function test_tp_getFullPlan(input: { tenant_id: string; id: string }) {
    const caller = createTrainingPlanCaller(input.tenant_id);
    return await caller.getFullPlan({ id: input.id });
}

// ============================================================================
// Wellness Router Test Utilities
// ============================================================================

const WELLNESS_TEST_USER = 'wellness-test-user';

export async function test_w_logDailyMetrics(input: {
    tenant_id: string;
    date: string;
    rhr: number;
    hrv_rmssd: number;
    sleep_score?: number;
    fatigue_score?: number;
    muscle_soreness_score?: number;
    stress_score?: number;
    mood_score?: number;
    diet_score?: number;
    data_source?: 'apple_health' | 'manual_slider' | 'agent_voice';
}) {
    const { wellnessRouter } = await import('../trpc/routers/wellnessRouter');
    const db = getDb();
    const caller = wellnessRouter.createCaller({
        session: { userId: WELLNESS_TEST_USER, tenantId: input.tenant_id },
        tenantId: input.tenant_id,
        userId: WELLNESS_TEST_USER,
        db,
    });
    return await caller.logDailyMetrics(input);
}

export async function test_w_getMetricsByDate(input: {
    tenant_id: string;
    date: string;
}) {
    const { wellnessRouter } = await import('../trpc/routers/wellnessRouter');
    const db = getDb();
    const caller = wellnessRouter.createCaller({
        session: { userId: WELLNESS_TEST_USER, tenantId: input.tenant_id },
        tenantId: input.tenant_id,
        userId: WELLNESS_TEST_USER,
        db,
    });
    return await caller.getMetricsByDate({ date: input.date });
}

export async function test_w_getMetricsByDateRange(input: {
    tenant_id: string;
    start_date: string;
    end_date: string;
}) {
    const { wellnessRouter } = await import('../trpc/routers/wellnessRouter');
    const db = getDb();
    const caller = wellnessRouter.createCaller({
        session: { userId: WELLNESS_TEST_USER, tenantId: input.tenant_id },
        tenantId: input.tenant_id,
        userId: WELLNESS_TEST_USER,
        db,
    });
    return await caller.getMetricsByDateRange({
        start_date: input.start_date,
        end_date: input.end_date,
    });
}

export async function test_w_logDailyMetricsViaAgent(input: {
    tenant_id: string;
    date: string;
    rhr?: number;
    hrv_rmssd?: number;
    sleep_score?: number;
    fatigue_score?: number;
    muscle_soreness_score?: number;
    stress_score?: number;
    mood_score?: number;
    diet_score?: number;
}) {
    const { wellnessRouter } = await import('../trpc/routers/wellnessRouter');
    const db = getDb();
    const caller = wellnessRouter.createCaller({
        session: { userId: WELLNESS_TEST_USER, tenantId: input.tenant_id },
        tenantId: input.tenant_id,
        userId: WELLNESS_TEST_USER,
        db,
    });
    return await caller.logDailyMetricsViaAgent(input);
}
