# Phase 6: Fix Critical Review Findings

**Date:** 2026-04-03
**Status:** PLAN
**Priority:** Security > Test Gaps > Performance

---

## Summary

Post-implementation review of Phases 1-5 found **8 critical issues** across security, testing, and performance. This plan addresses them in priority order across 7 independently verifiable units.

---

## Unit 1: Fix Cross-Tenant Clone Security Hole

**Finding:** `cloneTrainingPlanToTenant` reads the source plan via `getTrainingPlanById(db, { id: input.plan_id })` with **no `tenant_id` filter**, allowing any authenticated user to clone any plan across tenants by guessing UUIDs.

**Files to modify:**
- `src/services/trainingPlan.service.ts` — `cloneTrainingPlanToTenant()`

**Fix:**
The source plan lookup must enforce that the plan is either:
1. A system template (`tenant_id IS NULL AND is_system_template = 1`), OR
2. Owned by the calling tenant (`tenant_id = input.tenant_id`)

```typescript
// BEFORE (vulnerable):
const sourcePlan = await getTrainingPlanById(db, { id: input.plan_id });

// AFTER (secure):
const sourcePlan = await db
  .selectFrom('training_plan')
  .where('id', '=', input.plan_id)
  .where(eb => eb.or([
    eb.and([eb('tenant_id', 'is', null), eb('is_system_template', '=', 1)]),
    eb('tenant_id', '=', input.tenant_id),
  ]))
  .selectAll()
  .executeTakeFirst();
```

**Verification:**
- Existing test in `tests/trpc/routers/trainingPlanRouter.test.ts` (clone tests around lines 270-330) must still pass
- Add a test that verifies a tenant CANNOT clone a plan belonging to another tenant (cross-tenant rejection)

---

## Unit 2: Fix System Template Authorization + Configurable CORS

### 2A: System Template Authorization

**Finding:** Both `libraryRouter.addExercise` and `trainingPlanRouter.createPlan` accept `is_system_template: true` from **any authenticated user** with no role check. This allows privilege escalation — any athlete can create global exercises or training plans visible to all tenants.

**Root Cause:** The `TRPCContext` does not propagate `role` from the `users` table. The `SessionData` interface only has `userId` and `tenantId`.

**Files to modify:**
1. `src/trpc/context.ts` — Add `role` to `SessionData` and `TRPCContext`
2. `src/trpc/trpc.ts` — Propagate `role` through `protectedProcedure`
3. `src/trpc/routers/libraryRouter.ts` — Guard `is_system_template` behind admin check
4. `src/trpc/routers/trainingPlanRouter.ts` — Guard `is_system_template` behind admin check

**Schema changes: None** — `role` already exists in `users` table as `UserRole ('athlete' | 'admin')`.

**Implementation:**

1. Extend `SessionData`:
```typescript
export interface SessionData {
  userId: string;
  tenantId: string;
  role: UserRole;  // NEW
}
```

2. Extend `TRPCContext`:
```typescript
export interface TRPCContext {
  session: SessionData | null;
  tenantId: string | null;
  userId: string | null;
  role: UserRole | null;  // NEW
  db: Kysely<Database>;
}
```

3. Update `protectedProcedure` to propagate role:
```typescript
return await next({
  ctx: {
    ...ctx,
    session: ctx.session,
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.session?.role ?? null,  // NEW
  },
});
```

4. Guard `libraryRouter.addExercise`:
```typescript
.addExercise: protectedProcedure
  .input(addExerciseSchema)
  .mutation(async ({ ctx, input }) => {
    if (input.is_system_template && ctx.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can create system templates' });
    }
    const tenantId = input.is_system_template ? null : ctx.tenantId;
    // ... rest unchanged
  }),
```

5. Guard `trainingPlanRouter.createPlan`:
```typescript
createPlan: protectedProcedure
  .input(createTrainingPlanSchema)
  .mutation(async ({ ctx, input }) => {
    if (input.is_system_template && ctx.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can create system templates' });
    }
    // ... rest unchanged
  }),
```

6. Update session store implementation to include `role` when loading sessions (query the `users` table or include it in the session token).

**Verification:**
- Existing tests that use `is_system_template: true` must be updated to set `role: 'admin'` in the session context
- Add test: athlete user attempts `is_system_template: true` → gets `FORBIDDEN`
- Add test: admin user creates system template → succeeds

### 2B: Configurable CORS Origin

**Finding:** `src/trpc/handler.ts` hardcodes `Access-Control-Allow-Origin: *`.

**Files to modify:**
- `src/trpc/handler.ts`

**Fix:**
Accept an `allowedOrigin` option in `CreateHandlerOptions`, defaulting to `*` for backward compatibility:

```typescript
export interface CreateHandlerOptions {
  sessionStore: SessionStore;
  db: Kysely<Database>;
  allowedOrigin?: string;  // NEW — defaults to '*'
}

export function createTRPCHandler(opts: CreateHandlerOptions) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': opts.allowedOrigin ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  // ... rest unchanged
}
```

Update call sites that create the handler to pass `env.ALLOWED_ORIGIN` (or equivalent env var) if available.

**Verification:**
- Existing CORS tests in `tests/trpc/cors.test.ts` pass unchanged (default `*`)
- Add test: custom origin returns the configured value
- Update `test-utils.ts` CORS helpers to accept configurable origin

---

## Unit 3: Write trainingRouter Integration Tests

**Finding:** `trainingRouter` (`src/trpc/routers/trainingRouter.ts`) has **7 live procedures** with **zero test coverage**.

**Procedures to test:**
1. `logSession` — creates a workout session
2. `updateSession` — updates a workout session
3. `getSession` — gets a workout session by ID
4. `getSessionsByDateRange` — lists sessions by date range
5. `getACWRStatus` — returns ACWR calculation
6. `logSessionViaAgent` — creates with agent metadata
7. `markAsVoiceEntry` — marks session as voice-entry

**Test file to create:** `tests/trpc/routers/trainingRouter.test.ts`

**Test utilities to add in `src/app/test-utils.ts`:**
Follow the existing `test_w_logDailyMetrics` pattern — use `trainingRouter.createCaller()` with real `getDb()`:

```typescript
// Required test utilities (all exported):
test_tr_logSession(input)
test_tr_updateSession(input)
test_tr_getSession(input)
test_tr_getSessionsByDateRange(input)
test_tr_getACWRStatus(input)
test_tr_logSessionViaAgent(input)
test_tr_markAsVoiceEntry(input)
```

**Test structure:**
- `beforeEach`: Call `test_cleanDatabase` for TENANT_A and TENANT_B, create test users
- For each procedure: happy path + tenant isolation verification
- Cross-tenant test: Tenant A's session cannot be accessed by Tenant B
- Agent procedures: verify `is_voice_entry` and `agent_interaction_log` fields
- ACWR procedure: seed multiple sessions across 28 days to test acute/chronic load

**Dependencies:** Workout session service test utilities already exist in test-utils.ts (lines 128-179).

**Verification:**
- All 7 procedures have at least 1 happy-path test
- At least 3 cross-tenant isolation tests
- `vitestInvoke` pattern used throughout (no mocks)

---

## Unit 4: Rewrite dashboardRouter Tests from Mocks to Real D1

**Finding:** `tests/fate/dashboardRouter.test.ts` uses `vi.fn()` chained mocks for `db` — violates AGENTS.md anti-mock rule. Only 2 tests, both with false confidence.

**Current file:** `tests/fate/dashboardRouter.test.ts` (to be rewritten)

**Test utilities to add in `src/app/test-utils.ts`:**
```typescript
test_dash_getReadinessView(input: { date: string; history_days?: number; tenant_id: string; user_id?: string })
```

Uses `dashboardRouter.createCaller()` with real D1.

**Test structure:**
- `beforeEach`: Clean DB for both tenants, create users, seed wellness + workout data
- Test: `getReadinessView` returns ACWR data + wellness history for seeded user
- Test: `getReadinessView` returns empty arrays for user with no data
- Test: ACWR calculation with known data matches expected values
- Test: cross-tenant isolation (Tenant B gets no data from Tenant A's user)
- Test: UNAUTHORIZED for unauthenticated caller

**Verification:**
- Zero `vi.fn()` or mock usage
- Uses `vitestInvoke` + real D1 exclusively
- At least 4 meaningful assertions per test

---

## Unit 5: Fix CoachAgent False-Confidence AI Error Handling Tests

**Finding:** `tests/agent/CoachAgent.test.ts` lines 889-920 define inline constants and assert they equal themselves. These tests verify nothing.

**Current tests (DELETE):**
```typescript
// Tests that assert a constant equals itself — zero value
it('should have proper error response structure for AI failures', ...)
it('should handle rate limiting gracefully (error code pattern)', ...)
```

**Replacement tests:**
These should test actual AI error handling behavior via `vitestInvoke`:

1. **Test actual error response when AI binding fails:**
   - Use a test utility that triggers `handleChatMessage` with an intentionally invalid/expired AI context
   - Assert the error response has the correct structure: `{ type: 'error', code: 'AI_ERROR', message: '...' }`

2. **Test unknown message type handling:**
   - Send a message with type `'unknown_type'` to the message handler
   - Assert it returns `{ type: 'error', code: 'UNKNOWN_MESSAGE_TYPE' }`

If these error paths cannot be easily triggered via `vitestInvoke` (e.g., they require actual AI binding failures), then **delete the false-confidence tests** and add a `// TODO` comment with the specific integration test needed. False confidence is worse than no test.

**Verification:**
- No test asserts an inline constant equals itself
- Every assertion tests actual runtime behavior or the test is removed

---

## Unit 6: Batch Insert Optimization for cloneTrainingPlanToTenant

**Finding:** Sequential per-exercise inserts in `cloneTrainingPlanToTenant` cause up to 30 DB round-trips per plan clone. A plan with 5 sessions × 6 exercises = 30 individual `INSERT` statements.

**Files to modify:**
- `src/services/trainingPlan.service.ts` — `cloneTrainingPlanToTenant()`

**Fix strategy:**

1. **Fetch all exercises in one query** using `WHERE session_id IN (...)`:
```typescript
const sessionIds = sessions.map(s => s.id);
const allExercises = await db
  .selectFrom('session_exercise')
  .where('session_id', 'in', sessionIds)
  .selectAll()
  .execute();
const exercisesBySession = Map.groupBy(allExercises, e => e.session_id);
```

2. **Create all cloned sessions**, collecting their IDs.

3. **Batch insert exercises** with max 5 records per query (D1 variable limit per AGENTS.md):
```typescript
const allNewExercises: SessionExerciseTable[] = [];
// ... build exercise records mapping old session_id → new session_id

for (let i = 0; i < allNewExercises.length; i += 5) {
  const batch = allNewExercises.slice(i, i + 5);
  await db.insertInto('session_exercise').values(batch).execute();
}
```

**Round-trip reduction:** 30+ sequential queries → ~3 batched queries (1 plan + 1 sessions fetch + 1 exercises fetch + ~N/5 batch inserts).

**Verification:**
- Existing clone tests pass unchanged
- Plan with 6 sessions × 5 exercises clones correctly with all exercises preserved
- Verify exercise order is maintained after batch insert

---

## Unit 7: Batch Query Optimization for getFullTrainingPlan

**Finding:** `getFullTrainingPlan` does N+1 queries — one query per session to fetch exercises.

**Files to modify:**
- `src/services/trainingPlan.service.ts` — `getFullTrainingPlan()`

**Fix:**
Replace the per-session loop with a single query:

```typescript
// BEFORE (N+1):
for (const session of sessions) {
  const exercises = await getSessionExercisesBySession(db, { session_id: session.id });
  sessionsWithExercises.push({ ...session, exercises });
}

// AFTER (2 queries total):
const sessionIds = sessions.map(s => s.id);
const allExercises = sessionIds.length > 0
  ? await db
      .selectFrom('session_exercise')
      .where('session_id', 'in', sessionIds)
      .orderBy('order_in_session')
      .selectAll()
      .execute()
  : [];
const exercisesBySession = Map.groupBy(allExercises, e => e.session_id);

const sessionsWithExercises = sessions.map(session => ({
  ...session,
  exercises: exercisesBySession.get(session.id) ?? [],
}));
```

**Round-trip reduction:** 1 + N queries → 2 queries total.

**Verification:**
- Existing `getFullPlan` tests pass unchanged
- Exercise ordering preserved (`order_in_session` maintained)

---

## Execution Order

| Unit | Priority | Category | Dependencies | Est. Tests |
|------|----------|----------|-------------|------------|
| 1    | P0       | Security | None        | 1 new      |
| 2A   | P0       | Security | None        | 3 new      |
| 2B   | P0       | Security | None        | 2 new      |
| 3    | P1       | Testing  | None        | ~12 new    |
| 4    | P1       | Testing  | None        | ~5 new     |
| 5    | P1       | Testing  | None        | 0-2 net    |
| 6    | P2       | Performance | None     | 0 (existing) |
| 7    | P2       | Performance | None     | 0 (existing) |

**Units 1-2 (Security) MUST be implemented first.**
**Units 3-5 (Testing) can be parallelized.**
**Units 6-7 (Performance) can be parallelized with each other.**

---

## AGENTS.md Compliance Checklist

- [x] Kysely for all queries — no raw SQL
- [x] Real D1 integration tests via `vitestInvoke` — no mocks
- [x] Batch inserts limited to 5 records per query (Unit 6)
- [x] `tenant_id` enforcement on all data access (Units 1, 2A)
- [x] Multi-tenant isolation tests for every procedure (Units 3, 4)
- [x] No test mocks — rewrite dashboardRouter test from `vi.fn()` (Unit 4)
