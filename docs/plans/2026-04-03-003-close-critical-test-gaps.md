---
title: Close Critical Test Gaps (Phase 3)
type: testing
status: complete
date: 2026-04-03
origin: docs/ideation/2026-04-03-cleanup-sweep-ideation.md
depends_on: docs/plans/2026-04-03-002-split-training-plan-god-object.md
---

# Close Critical Test Gaps

## Overview

**Problem:** Two services (`user.service.ts`, `exerciseDictionary.service.ts`) have **zero tests**. Two routers created by Phase 2 (`trainingPlanRouter`, `trainingSessionRouter`) have **zero test files**. The `wellnessRouter.test.ts` uses **mocked database** (violates AGENTS.md anti-mock rule). The `libraryRouter.test.ts` covers only **3 of 11 procedures**. The CoachAgent `handleChatMessage()` is completely untested at the router level.

**Impact:** 29 tRPC procedures across 2 routers have zero verification. 28 service functions have zero direct test coverage. One malformed request could break the workout logging pipeline with no safety net.

**Solution:** Create 5 new test files and rewrite 1 existing test file, all following the Test Bridge pattern (`vitestInvoke` + real D1). Add test utilities to `src/app/test-utils.ts` for the two untested services.

**Test count target:** ~125 new integration tests across 6 files.

---

## Current State Audit

### Existing Tests (as of Phase 2 completion)

| File | Tests | Pattern | Notes |
|------|-------|---------|-------|
| `tests/services/trainingPlan.service.test.ts` | 10 | `vitestInvoke` | Multi-tenancy isolation |
| `tests/services/workoutSession.service.test.ts` | 26 | `vitestInvoke` | Full CRUD + multi-tenant |
| `tests/services/dailyWellness.service.test.ts` | 22 | `vitestInvoke` | Full CRUD + multi-tenant |
| `tests/services/acwr.service.test.ts` | 28 | Mixed | Pure functions + `vitestInvoke` |
| `tests/services/upsert.test.ts` | 6 | `vitestInvoke` | Upsert patterns |
| `tests/services/errors.test.ts` | 9 | `vitestInvoke` | Error handling |
| `tests/trpc/routers/libraryRouter.test.ts` | 3 | `vitestInvoke` | Only addExercise, getExercises, saveBenchmark |
| `tests/trpc/routers/wellnessRouter.test.ts` | 5 | **MOCKED DB** ❌ | Violates anti-mock rule |
| `tests/agent/CoachAgent.test.ts` | 68 | `vitestInvoke` | Tool execution, state, security |
| `tests/integration/architectureProof.test.ts` | 3 | `vitestInvoke` | Smoke tests |
| `tests/integration/coachAgent.websocket.test.ts` | 16 | `vitestInvoke` | WebSocket lifecycle |
| `tests/trpc/context.test.ts` | 2 | Mocked session store | Acceptable (context only) |
| **Total** | **~196** | | |

### Zero-Coverage Gaps (P0)

| Target | Functions/Procedures | Severity |
|--------|---------------------|----------|
| `user.service.ts` | 10 functions: `createUser`, `getUserById`, `getUserByExternalAuthId`, `getUserByEmail`, `getUsersByTenant`, `updateUser`, `deleteUser`, `deactivateUser`, `reactivateUser`, `linkExternalAuth` | P0 |
| `exerciseDictionary.service.ts` | 18 functions: 7 exercise CRUD + 10 benchmark CRUD + 1 pure function (`calculateTrainingMax`) | P0 |
| `trainingPlanRouter.ts` | 8 procedures: `createPlan`, `getPlan`, `getSystemPlans`, `getPlansForTenant`, `updatePlan`, `deletePlan`, `clonePlan`, `getFullPlan` | P0 |
| `trainingSessionRouter.ts` | 13 procedures: 7 session CRUD + 6 exercise CRUD | P0 |

### Partial-Coverage Gaps (P1)

| Target | Status | Issue |
|--------|--------|-------|
| `wellnessRouter.test.ts` | 5 tests | Uses mocked DB (rewrite needed) |
| `libraryRouter.test.ts` | 3/11 procedures | Missing 8 procedures |

---

## Proposed Solution

### Part A: Add Test Utilities for Untested Services

Add the following functions to `src/app/test-utils.ts`:

#### User Service Test Utilities

```typescript
// Required for user.service integration tests
export async function test_getUserById(input: { id: string; tenant_id?: string }) { ... }
export async function test_getUserByEmail(input: { email: string; tenant_id?: string }) { ... }
export async function test_getUserByExternalAuthId(input: { external_auth_id: string }) { ... }
export async function test_getUsersByTenant(input: { tenant_id: string; is_active?: number }) { ... }
export async function test_updateUser(input: { id: string; tenant_id?: string; email?: string; ... }) { ... }
export async function test_deleteUser(input: { id: string; tenant_id?: string }) { ... }
export async function test_deactivateUser(input: { id: string; tenant_id?: string }) { ... }
export async function test_reactivateUser(input: { id: string; tenant_id?: string }) { ... }
export async function test_linkExternalAuth(input: { user_id: string; external_auth_id: string; tenant_id?: string }) { ... }
```

**Note:** `test_createUser` and `test_deleteUser` already exist in `test-utils.ts`.

#### Exercise Dictionary Test Utilities

```typescript
// Required for exerciseDictionary.service integration tests
export async function test_getExerciseById(input: { id: string; tenant_id?: string | null }) { ... }
export async function test_getExercisesByCategory(input: { tenant_id: string | null; movement_category: string }) { ... }
export async function test_getExercisesByBenchmarkTarget(input: { benchmark_target: string; tenant_id?: string | null }) { ... }
export async function test_getSystemExercises() { ... }
export async function test_getExercisesForTenant(tenant_id: string) { ... }
export async function test_updateExercise(input: { id: string; tenant_id: string | null; ... }) { ... }
export async function test_deleteExercise(input: { id: string; tenant_id: string | null }) { ... }
export async function test_createUserBenchmark(input: { tenant_id: string; user_id: string; benchmark_name: string; ... }) { ... }
export async function test_getUserBenchmark(input: { tenant_id: string; user_id: string; benchmark_name: string }) { ... }
export async function test_getUserBenchmarks(input: { tenant_id: string; user_id: string }) { ... }  // Already exists
export async function test_updateUserBenchmark(input: { id: string; tenant_id: string; ... }) { ... }
export async function test_deleteUserBenchmark(input: { id: string; tenant_id: string; ... }) { ... }
export async function test_deleteUserBenchmarkByName(input: { tenant_id: string; user_id: string; benchmark_name: string }) { ... }
export async function test_getUserBenchmarkById(input: { id: string; tenant_id: string; ... }) { ... }
export async function test_calculateTrainingMax(input: { benchmark_value: number; training_max_percentage: number }) { ... }
export async function test_getTrainingMaxForExercise(input: { tenant_id: string; user_id: string; exercise_id: string }) { ... }
```

**Note:** `test_createExercise` already exists. Several benchmark utilities also exist (`test_upsertUserBenchmark`, `test_getUserBenchmarks`).

#### Router Test Utilities

Add router-level test utilities for `trainingPlanRouter` and `trainingSessionRouter`:

```typescript
// Training Plan Router (uses createCaller pattern like libraryRouter)
export async function test_tp_createPlan(input: { tenant_id: string; name: string; ... }) { ... }
export async function test_tp_getPlan(input: { tenant_id: string; id: string }) { ... }
export async function test_tp_getSystemPlans(input: { tenant_id: string }) { ... }
export async function test_tp_getPlansForTenant(input: { tenant_id: string }) { ... }
export async function test_tp_updatePlan(input: { tenant_id: string; id: string; ... }) { ... }
export async function test_tp_deletePlan(input: { tenant_id: string; id: string }) { ... }
export async function test_tp_clonePlan(input: { tenant_id: string; plan_id: string; ... }) { ... }
export async function test_tp_getFullPlan(input: { tenant_id: string; id: string }) { ... }

// Training Session Router
export async function test_ts_createSession(input: { tenant_id: string; plan_id: string; ... }) { ... }
export async function test_ts_getSession(input: { tenant_id: string; id: string }) { ... }
// ... etc for all 13 procedures
```

**Alternative pattern:** Follow the `libraryRouter.test.ts` pattern which uses `createCaller` directly inside the test file, calling the router's `createCaller` with a mock context containing `{ db, tenantId, userId, session }`. This avoids adding 21 more utility functions to `test-utils.ts`.

**Recommendation:** Use the **`createCaller` pattern directly in test files** for router tests. This is simpler and matches the existing `libraryRouter.test.ts` pattern. Only add service-level utilities to `test-utils.ts`.

### Part B: New Test Files

#### 1. `tests/services/user.service.test.ts` (NEW — ~20 tests)

**Priority:** P0
**Pattern:** `vitestInvoke` with real D1

```
describe('User Service - Integration Tests')
  describe('createUser')
    ✓ should create user with all fields
    ✓ should default role to 'athlete'
    ✓ should default is_active to 1
    ✓ should generate UUID if id not provided
    ✓ should store display_name when provided
    ✓ should store external_auth_id when provided

  describe('getUserById')
    ✓ should find user by id
    ✓ should return undefined for non-existent id
    ✓ should filter by tenant_id when provided
    ✓ should return user regardless of tenant without filter

  describe('getUserByExternalAuthId')
    ✓ should find user by external_auth_id
    ✓ should return undefined for non-existent auth id

  describe('getUserByEmail')
    ✓ should find user by email
    ✓ should filter by tenant_id when provided
    ✓ should return undefined for non-existent email

  describe('getUsersByTenant')
    ✓ should return all users for a tenant
    ✓ should filter by is_active when provided
    ✓ should not return users from other tenants

  describe('updateUser')
    ✓ should update email
    ✓ should update role
    ✓ should update display_name
    ✓ should filter by tenant_id when provided
    ✓ should not update user from different tenant

  describe('deleteUser')
    ✓ should delete user and return true
    ✓ should return false for non-existent user
    ✓ should filter by tenant_id when provided

  describe('deactivateUser')
    ✓ should set is_active to 0
    ✓ should preserve other fields

  describe('reactivateUser')
    ✓ should set is_active to 1

  describe('linkExternalAuth')
    ✓ should set external_auth_id on user
    ✓ should filter by tenant_id when provided

  describe('Multi-tenant isolation')
    ✓ should not find user from another tenant via getUserById
    ✓ should not update user from another tenant
    ✓ should not delete user from another tenant
```

**Estimated tests:** ~22

#### 2. `tests/services/exerciseDictionary.service.test.ts` (NEW — ~30 tests)

**Priority:** P0
**Pattern:** `vitestInvoke` with real D1

```
describe('Exercise Dictionary Service - Integration Tests')
  describe('Exercise CRUD')
    describe('createExercise')
      ✓ should create exercise with all fields
      ✓ should create system exercise (tenant_id = null)
      ✓ should create tenant-specific exercise
      ✓ should default benchmark_target and conversion_factor to null

    describe('getExerciseById')
      ✓ should find exercise by id
      ✓ should return undefined for non-existent id
      ✓ should filter by tenant_id when provided

    describe('getExercisesByCategory')
      ✓ should return exercises matching category
      ✓ should return empty for non-existent category
      ✓ should respect tenant_id filter (null for global)

    describe('getExercisesByBenchmarkTarget')
      ✓ should find exercises targeting a benchmark
      ✓ should filter by tenant_id when provided

    describe('getSystemExercises')
      ✓ should return only global (tenant_id = null) exercises
      ✓ should not include tenant-specific exercises

    describe('getExercisesForTenant')
      ✓ should return global + tenant-specific exercises
      ✓ should not return exercises from other tenants

    describe('updateExercise')
      ✓ should update name
      ✓ should update exercise_type
      ✓ should update benchmark_target
      ✓ should update conversion_factor
      ✓ should not update exercise from different tenant

    describe('deleteExercise')
      ✓ should delete exercise and return true
      ✓ should return false for non-existent exercise
      ✓ should not delete exercise from different tenant

  describe('User Benchmark CRUD')
    describe('createUserBenchmark')
      ✓ should create benchmark with all fields
      ✓ should default training_max_percentage to 100
      ✓ should require valid user (FK constraint)

    describe('upsertUserBenchmark')
      ✓ should create new benchmark if not exists
      ✓ should update existing benchmark by name
      ✓ should preserve training_max_percentage on update when not provided

    describe('getUserBenchmark')
      ✓ should find benchmark by name
      ✓ should return undefined for non-existent name

    describe('getUserBenchmarks')
      ✓ should return all benchmarks for user
      ✓ should return empty for user with no benchmarks

    describe('calculateTrainingMax')
      ✓ should calculate value * percentage / 100
      ✓ should return null for null benchmark_value
      ✓ should handle 100% percentage
      ✓ should handle 90% percentage (Wendler)

    describe('getTrainingMaxForExercise')
      ✓ should return training max with conversion factor
      ✓ should return null when exercise has no benchmark_target
      ✓ should return null when no benchmark exists for user
      ✓ should apply conversion factor when present

    describe('updateUserBenchmark')
      ✓ should update benchmark_value
      ✓ should update training_max_percentage
      ✓ should filter by tenant_id and optional user_id

    describe('deleteUserBenchmark')
      ✓ should delete by id and return true
      ✓ should filter by tenant_id

    describe('deleteUserBenchmarkByName')
      ✓ should delete by name and return true
      ✓ should return false for non-existent name

    describe('getUserBenchmarkById')
      ✓ should find benchmark by id
      ✓ should return undefined for non-existent id

  describe('Multi-tenant isolation')
    ✓ should not return exercises from another tenant via getExercisesForTenant
    ✓ should not update exercise belonging to another tenant
    ✓ should not delete exercise belonging to another tenant
    ✓ should not access benchmarks from another tenant
```

**Estimated tests:** ~35

#### 3. `tests/trpc/routers/trainingPlanRouter.test.ts` (NEW — ~18 tests)

**Priority:** P0
**Pattern:** `createCaller` with real D1 (follows `libraryRouter.test.ts` pattern)

```
describe('trainingPlanRouter - Integration Tests')
  beforeEach: clean training plan data

  describe('createPlan')
    ✓ should create a training plan for the authenticated tenant
    ✓ should set is_system_template to 0 by default
    ✓ should require name

  describe('getPlan')
    ✓ should return plan by id for correct tenant
    ✓ should return undefined for plan from another tenant

  describe('getSystemPlans')
    ✓ should return only system template plans

  describe('getPlansForTenant')
    ✓ should return system templates + tenant plans
    ✓ should not include plans from other tenants

  describe('updatePlan')
    ✓ should update plan name for correct tenant
    ✓ should return undefined for plan from another tenant

  describe('deletePlan')
    ✓ should delete plan and return truthy for correct tenant
    ✓ should return false for plan from another tenant

  describe('clonePlan')
    ✓ should clone system plan to tenant with sessions and exercises
    ✓ should apply custom name when provided
    ✓ should append "(Copy)" to name by default
    ✓ should return undefined for non-existent source plan

  describe('getFullPlan')
    ✓ should return plan with sessions and exercises
    ✓ should return undefined for plan from another tenant
```

**Estimated tests:** ~18

#### 4. `tests/trpc/routers/trainingSessionRouter.test.ts` (NEW — ~25 tests)

**Priority:** P0
**Pattern:** `createCaller` with real D1

```
describe('trainingSessionRouter - Integration Tests')
  beforeEach: clean training plan data + create parent plan

  describe('Session CRUD')
    describe('createSession')
      ✓ should create session under a plan for authenticated tenant
      ✓ should set optional fields when provided

    describe('getSession')
      ✓ should return session by id for correct tenant
      ✓ should return undefined for session from another tenant

    describe('getSessionsByPlan')
      ✓ should return all sessions for a plan
      ✓ should not include sessions from other tenants' plans

    describe('getSessionsByWeek')
      ✓ should filter sessions by week_number
      ✓ should return empty for non-existent week

    describe('updateSession')
      ✓ should update session fields
      ✓ should return undefined for session from another tenant

    describe('deleteSession')
      ✓ should delete session and return truthy
      ✓ should cascade delete child exercises

    describe('getFullSession')
      ✓ should return session with exercises populated
      ✓ should return undefined for non-existent session

  describe('Exercise CRUD')
    beforeEach: create parent plan + session + exercise dictionary entry

    describe('createExercise')
      ✓ should create exercise in session for authenticated tenant
      ✓ should set order_in_session correctly

    describe('getExercise')
      ✓ should return exercise by id for correct tenant
      ✓ should return undefined for exercise from another tenant

    describe('getExercisesBySession')
      ✓ should return all exercises for a session
      ✓ should return empty for session with no exercises

    describe('getExercisesGrouped')
      ✓ should return exercises grouped by circuit_group
      ✓ should use 'ungrouped' key for null circuit_group
      ✓ should handle multiple circuit groups

    describe('updateExercise')
      ✓ should update exercise fields
      ✓ should return undefined for exercise from another tenant

    describe('deleteExercise')
      ✓ should delete exercise and return truthy
      ✓ should return false for exercise from another tenant

  describe('Multi-tenant isolation (router level)')
    ✓ should not access sessions from another tenant
    ✓ should not access exercises from another tenant
```

**Estimated tests:** ~25

#### 5. `tests/trpc/routers/wellnessRouter.test.ts` (REWRITE — ~12 tests)

**Priority:** P1 (fixes anti-mock rule violation)
**Pattern:** Rewrite to use `vitestInvoke` with real D1

**Current state:** Uses `vi.fn()` to mock all Kysely methods. Must be completely rewritten to use `vitestInvoke` calling through the `/_test` bridge.

```
describe('wellnessRouter - Integration Tests')
  beforeEach: clean database

  describe('logDailyMetrics')
    ✓ should create a wellness record for authenticated user (via test utility that calls router)
    ✓ should create a wellness record with all subjective scores
    ✓ should use upsert behavior (update if same date exists)

  describe('getMetricsByDate')
    ✓ should fetch wellness record by date
    ✓ should return null for non-existent date

  describe('getMetricsByDateRange')
    ✓ should fetch records within date range
    ✓ should return empty for range with no data

  describe('logDailyMetricsViaAgent')
    ✓ should create wellness with data_source=agent_voice
    ✓ should default rhr and hrv_rmssd when not provided

  describe('Multi-tenant isolation')
    ✓ should not return wellness from another tenant
    ✓ should not update wellness from another tenant
```

**Note:** The router-level wellness tests need router test utilities added to `test-utils.ts` using the `createCaller` pattern (like `libraryRouter`). Alternatively, use the existing service-level utilities and test the router via `createCaller` directly in the test file.

**Estimated tests:** ~12

#### 6. `tests/trpc/routers/libraryRouter.test.ts` (EXTEND — ~12 new tests)

**Priority:** P1 (closes 8/11 untested procedures)
**Pattern:** Extend existing `vitestInvoke` tests

**Current coverage:** `addExercise`, `getExercises` (by category), `saveUserBenchmark`
**Missing:** `updateExercise`, `deleteExercise`, `getExercisesByBenchmark`, `getSystemExercises`, `getUserBenchmark`, `getUserBenchmarks`, `getTrainingMaxForExercise`

```
Add these describe blocks to existing file:

  describe('updateExercise')
    ✓ should update exercise name
    ✓ should update benchmark_target
    ✓ should not update exercise from another tenant

  describe('deleteExercise')
    ✓ should delete exercise and return truthy
    ✓ should return false for non-existent exercise

  describe('getExercisesByBenchmark')
    ✓ should find exercises by benchmark_target

  describe('getSystemExercises')
    ✓ should return only global exercises

  describe('getUserBenchmark')
    ✓ should return benchmark by name

  describe('getUserBenchmarks')
    ✓ should return all benchmarks for user

  describe('getTrainingMaxForExercise')
    ✓ should calculate training max with conversion factor
    ✓ should return null when no benchmark exists

  describe('Multi-tenant isolation')
    ✓ should not return exercises from another tenant
    ✓ should not return benchmarks from another tenant
```

**Estimated tests:** ~12 new (total: ~15)

---

## Technical Considerations

### 1. Test Bridge Pattern

All tests use `vitestInvoke` from `rwsdk-community/test`:

```typescript
import { vitestInvoke } from 'rwsdk-community/test';

// Service-level test (uses test-utils.ts helper)
const user = await vitestInvoke<UserRecord>('test_createUser', { ... });

// Router-level test (uses createCaller pattern)
import { trainingPlanRouter } from '../../../src/trpc/routers/trainingPlanRouter';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import { env } from 'cloudflare:test';

function getDb() {
  return new Kysely<Database>({ dialect: new D1Dialect({ database: env.DB }) });
}

function createCaller(tenantId: string, userId: string) {
  const db = getDb();
  return trainingPlanRouter.createCaller({
    session: { userId, tenantId },
    tenantId,
    userId,
    db,
  });
}
```

### 2. Router Test Pattern Decision

Two patterns exist in the codebase:
- **Pattern A:** `libraryRouter.test.ts` — uses `vitestInvoke('test_library_addExercise', ...)` which calls `createCaller` inside test-utils
- **Pattern B:** Direct `createCaller` in test file

**Recommendation for router tests:** Use **Pattern A** for consistency. Add router-level utilities to `test-utils.ts` that wrap `createCaller`. This keeps the test files clean and the pattern uniform.

### 3. Data Dependencies

Tests for routers require parent data:
- `trainingSessionRouter` tests need a parent `training_plan` record
- `session_exercise` tests need both parent `training_session` and `exercise_dictionary` records
- `user_benchmark` tests need a parent `user` record (FK constraint)

Use `beforeEach` to set up parent records using existing test utilities.

### 4. Multi-Tenant Testing Pattern

Every router and service test file should include at least one cross-tenant isolation test:
```typescript
const TENANT_A = 'tenant-test-a';
const TENANT_B = 'tenant-test-b';

beforeEach(async () => {
  await vitestInvoke('test_cleanDatabase', TENANT_A);
  await vitestInvoke('test_cleanDatabase', TENANT_B);
});
```

### 5. Test Cleanup

Extend `test_cleanDatabase` in `test-utils.ts` to also clean:
- `user` table (needed for user.service tests)
- `training_plan`, `training_session`, `session_exercise` tables (already exists as `test_cleanTrainingPlanData`)

Add a `test_cleanAllTestData` utility that cleans all tables for a tenant in dependency order:
```
session_exercise → training_session → training_plan → user_benchmarks → workout_session → daily_wellness → exercise_dictionary → user
```

### 6. Schema Awareness

The `tests/setup.ts` SCHEMA must include all tables. Verify it already includes `user`, `exercise_dictionary`, `user_benchmarks`, `training_plan`, `training_session`, `session_exercise` — all present as confirmed in audit.

---

## Acceptance Criteria

### New Test Files
- [ ] `tests/services/user.service.test.ts` created with ~20 tests, all passing
- [ ] `tests/services/exerciseDictionary.service.test.ts` created with ~30 tests, all passing
- [ ] `tests/trpc/routers/trainingPlanRouter.test.ts` created with ~18 tests, all passing
- [ ] `tests/trpc/routers/trainingSessionRouter.test.ts` created with ~25 tests, all passing

### Rewritten/Extended Test Files
- [ ] `tests/trpc/routers/wellnessRouter.test.ts` rewritten to use real D1 (no mocks)
- [ ] `tests/trpc/routers/libraryRouter.test.ts` extended to cover 11/11 procedures

### Test Utilities
- [ ] `src/app/test-utils.ts` updated with user service utilities
- [ ] `src/app/test-utils.ts` updated with exercise dictionary service utilities
- [ ] `src/app/test-utils.ts` updated with router-level utilities for trainingPlan and trainingSession
- [ ] Test cleanup utilities handle all tables in dependency order

### Quality Gates
- [ ] Zero mocked database calls across all test files (anti-mock rule)
- [ ] All new tests use `vitestInvoke` or `createCaller` with real D1
- [ ] Multi-tenant isolation tested in every file
- [ ] All existing tests continue to pass (no regressions)
- [ ] `vitest run` passes with 0 failures

---

## Implementation Units

### Unit 1: User Service Test Utilities
**Goal:** Add user service helpers to `src/app/test-utils.ts`
**Files:**
- `src/app/test-utils.ts` (modify — add ~9 test utility functions)

**Functions to add:**
- `test_getUserById`
- `test_getUserByEmail`
- `test_getUserByExternalAuthId`
- `test_getUsersByTenant`
- `test_updateUser`
- `test_deactivateUser`
- `test_reactivateUser`
- `test_linkExternalAuth`

**Note:** `test_createUser` and `test_deleteUser` already exist.

---

### Unit 2: User Service Tests
**Goal:** Create `tests/services/user.service.test.ts` with full CRUD + multi-tenant isolation
**Files:**
- `tests/services/user.service.test.ts` (create)

**Test outline:** ~22 tests covering all 10 exported functions plus multi-tenant isolation scenarios.

---

### Unit 3: Exercise Dictionary Test Utilities
**Goal:** Add exercise dictionary helpers to `src/app/test-utils.ts`
**Files:**
- `src/app/test-utils.ts` (modify — add ~12 test utility functions)

**Functions to add:**
- `test_getExerciseById`
- `test_getExercisesByCategory`
- `test_getExercisesByBenchmarkTarget`
- `test_getSystemExercises`
- `test_getExercisesForTenant`
- `test_updateExercise`
- `test_deleteExercise`
- `test_createUserBenchmark`
- `test_getUserBenchmark`
- `test_updateUserBenchmark`
- `test_deleteUserBenchmark`
- `test_deleteUserBenchmarkByName`
- `test_getUserBenchmarkById`
- `test_calculateTrainingMax` (pure function, wraps service export)
- `test_getTrainingMaxForExercise`

**Note:** `test_createExercise`, `test_upsertUserBenchmark`, `test_getUserBenchmarks` already exist.

---

### Unit 4: Exercise Dictionary Service Tests
**Goal:** Create `tests/services/exerciseDictionary.service.test.ts` with full coverage
**Files:**
- `tests/services/exerciseDictionary.service.test.ts` (create)

**Test outline:** ~35 tests covering all 18 exported functions, including the pure `calculateTrainingMax` and the composite `getTrainingMaxForExercise`.

---

### Unit 5: Training Plan Router Tests
**Goal:** Create `tests/trpc/routers/trainingPlanRouter.test.ts`
**Files:**
- `src/app/test-utils.ts` (modify — add router test utilities for 8 procedures)
- `tests/trpc/routers/trainingPlanRouter.test.ts` (create)

**Test outline:** ~18 tests covering all 8 procedures. The `clonePlan` procedure is the most complex (creates deep copy of sessions + exercises).

**Router utilities to add:**
- `test_tp_createPlan`
- `test_tp_getPlan`
- `test_tp_getSystemPlans`
- `test_tp_getPlansForTenant`
- `test_tp_updatePlan`
- `test_tp_deletePlan`
- `test_tp_clonePlan`
- `test_tp_getFullPlan`

---

### Unit 6: Training Session Router Tests
**Goal:** Create `tests/trpc/routers/trainingSessionRouter.test.ts`
**Files:**
- `src/app/test-utils.ts` (modify — add router test utilities for 13 procedures)
- `tests/trpc/routers/trainingSessionRouter.test.ts` (create)

**Test outline:** ~25 tests covering all 13 procedures (7 session + 6 exercise). Requires parent plan and exercise dictionary setup in `beforeEach`.

**Router utilities to add:**
- `test_ts_createSession`, `test_ts_getSession`, `test_ts_getSessionsByPlan`, `test_ts_getSessionsByWeek`
- `test_ts_updateSession`, `test_ts_deleteSession`, `test_ts_getFullSession`
- `test_ts_createExercise`, `test_ts_getExercise`, `test_ts_getExercisesBySession`
- `test_ts_getExercisesGrouped`, `test_ts_updateExercise`, `test_ts_deleteExercise`

---

### Unit 7: Rewrite Wellness Router Tests
**Goal:** Replace mocked `wellnessRouter.test.ts` with real D1 integration tests
**Files:**
- `src/app/test-utils.ts` (modify — add wellness router utilities)
- `tests/trpc/routers/wellnessRouter.test.ts` (rewrite — remove all mocks)

**Test outline:** ~12 tests covering 5 router procedures using `vitestInvoke` with real D1.

**Router utilities to add:**
- `test_w_logDailyMetrics`
- `test_w_getMetricsByDate`
- `test_w_getMetricsByDateRange`
- `test_w_logDailyMetricsViaAgent`

---

### Unit 8: Extend Library Router Tests
**Goal:** Cover remaining 8/11 procedures in `libraryRouter.test.ts`
**Files:**
- `src/app/test-utils.ts` (modify — add missing library router utilities)
- `tests/trpc/routers/libraryRouter.test.ts` (modify — add new describe blocks)

**Router utilities to add:**
- `test_library_updateExercise`
- `test_library_deleteExercise`
- `test_library_getExercisesByBenchmark`
- `test_library_getSystemExercises`
- `test_library_getUserBenchmark`
- `test_library_getUserBenchmarks`
- `test_library_getTrainingMaxForExercise`

**Test outline:** ~12 new tests covering 8 previously untested procedures.

---

## Execution Priority Order

| Order | Unit | Impact | Est. Tests | Dependency |
|-------|------|--------|------------|------------|
| 1 | Unit 1 + Unit 2: User service | P0 — 10 functions, zero tests | ~22 | None |
| 2 | Unit 3 + Unit 4: Exercise dictionary | P0 — 18 functions, zero tests | ~35 | None |
| 3 | Unit 5: Training plan router | P0 — 8 procedures, zero tests | ~18 | Unit 2 (test-utils) |
| 4 | Unit 6: Training session router | P0 — 13 procedures, zero tests | ~25 | Unit 5 (parent plan setup) |
| 5 | Unit 7: Wellness router rewrite | P1 — fixes anti-mock violation | ~12 | None |
| 6 | Unit 8: Library router extend | P1 — closes 8 procedure gap | ~12 | None |

**Total estimated new/rewritten tests:** ~124

---

## Sources & References

- **Origin document:** `docs/ideation/2026-04-03-cleanup-sweep-ideation.md` (Idea #3)
- **Prerequisite:** `docs/plans/2026-04-03-002-split-training-plan-god-object.md` (Phase 2)
- **AGENTS.md constraints:**
  - Anti-Mock Rule: True integration tests, no mocked DB
  - Test Bridge: Use `/_test` route and `vitestInvoke`
  - Fidelity Hierarchy: Real > Fake > Mock
- **Institutional learnings:**
  - `testing/cloudflare-d1-kysely.md` — Test bridge pattern, schema sync, cleanup
  - `testing/combined-test-files-can-remain-as-is-after-service-splits.md` — Test files don't need splitting when feature boundary is cohesive
