---
module: testing
problem_type: best_practice
tags: ["phase-3","integration-tests","test-utils","service-tests","router-tests"]
---
### [2026-04-03] Phase 3: Close Critical Test Gaps — Complete Pattern Inventory
## Phase 3: Close Critical Test Gaps — Summary & Patterns

### What Was Accomplished
Phase 3 created **134 new integration tests** across 6 files, bringing the total test count from ~237 to ~371.

**New Files Created (2 service test files):**
- `tests/services/dailyWellness.service.test.ts` — 22 tests
- `tests/services/workoutSession.service.test.ts` — 26 tests

**Rewritten/Extended Files (4 router test files):**
- `tests/trpc/routers/wellnessRouter.test.ts` — rewritten from mock-based to real D1 (11 tests)
- `tests/trpc/routers/libraryRouter.test.ts` — extended from 3/11 to 11/11 procedure coverage (19 tests)
- `tests/trpc/routers/trainingPlanRouter.test.ts` — 19 tests
- `tests/trpc/routers/trainingSessionRouter.test.ts` — 29 tests

### Two Distinct Test Patterns

#### Pattern 1: Service Tests (vitestInvoke + test-utils helpers)
Used for services that are pure data functions with no tRPC context:
```
tests/services/dailyWellness.service.test.ts
tests/services/workoutSession.service.test.ts
```
- Import `vitestInvoke` from `rwsdk-community/test`
- Call `test_*` helper functions registered in `src/app/test-utils.ts`
- These helpers call service functions directly with `getDb()`
- No tRPC router, no session/auth context needed
- Good for testing pure business logic (calculations, CRUD, validation)

#### Pattern 2: Router Tests (createCaller with real D1)
Used for tRPC router procedures requiring authenticated context:
```
tests/trpc/routers/wellnessRouter.test.ts
tests/trpc/routers/libraryRouter.test.ts
tests/trpc/routers/trainingPlanRouter.test.ts
tests/trpc/routers/trainingSessionRouter.test.ts
```
- Test utils use `router.createCaller({ session, tenantId, userId, db })` to create authenticated callers
- Called via `vitestInvoke` from test files
- Tests the full tRPC middleware chain (auth, validation, procedure logic)
- Follows the libraryRouter.test.ts pattern established earlier

### test-utils.ts Growth
- Phase 3 expanded test-utils.ts to **~60+ exported `test_*` functions** (121 total export lines including helpers)
- Key sections added/extended:
  - Daily wellness CRUD + aggregation helpers
  - Workout session CRUD + date range helpers
  - Wellness router caller helpers (`test_w_logDailyMetrics`, etc.)
  - Library router caller helpers (exercise CRUD, benchmarks, training max)
  - Training plan/session caller helpers
  - `test_cleanDatabase` now handles ALL tables in dependency order

### Multi-Tenant Isolation Pattern (Universal)
Every Phase 3 test file follows the same cross-tenant verification pattern:
1. Define `TEST_TENANT` and `TEST_TENANT_B` (or `_b` variant)
2. Clean both tenants in `beforeEach`
3. Create data under TENANT_A
4. Verify TENANT_B cannot read/update/delete TENANT_A's data
5. This is enforced as a standard — not optional

### Key Gotchas
1. **Wellness rewrite complexity**: Required understanding the old mock structure before replacing. The mock-based tests had mocked `db` and `session` objects. The rewrite uses real D1 via `vitestInvoke`.
2. **Router tests need parent data setup**: `trainingPlanRouter` and `trainingSessionRouter` tests require `beforeEach` to create parent entities (plans, sessions, exercise dictionary entries) before testing child operations.
3. **WebSocket tests remain skipped**: `coachAgent.websocket.test.ts` has 16 tests in a `describe.skipIf(!shouldRun)` block. These require a running dev server and are expected to be skipped in CI.
4. **134 tests vs ~124 estimate**: Normal variance when test writing reveals additional edge cases worth covering.

### test_cleanDatabase — Dependency Order
The cleanup function deletes tables in FK dependency order:
```
session_exercise → training_session → training_plan → workout_session → daily_wellness → user_benchmarks → exercise_dictionary → user
```
Any new table with FKs must be added to this list in the correct position.
