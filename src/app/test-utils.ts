import {
    calculateACWR,
    calculateHistoricalACWR,
    getACWRTrendSummary
} from "../services/acwr.service";
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
    await db.deleteFrom('workout_session').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('daily_wellness').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('exercise_dictionary').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('user_benchmarks').where('tenant_id', '=', tenantId).execute();
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
    const { createTrainingSession } = await import('../services/trainingPlan.service');
    return await createTrainingSession(db, input);
}

export async function test_getTrainingSessionsByPlan(plan_id: string) {
    const db = getDb();
    const { getTrainingSessionsByPlan } = await import('../services/trainingPlan.service');
    return await getTrainingSessionsByPlan(db, { plan_id });
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
