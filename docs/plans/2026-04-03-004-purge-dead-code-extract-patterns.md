---
title: Purge Dead Code & Extract Shared Patterns (Phase 4)
type: cleanup
status: in-progress
date: 2026-04-03
origin: docs/ideation/2026-04-03-cleanup-sweep-ideation.md (Idea #4)
depends_on: docs/plans/2026-04-03-003-close-critical-test-gaps.md
---

# Purge Dead Code & Extract Shared Patterns

## Overview

**Problem:** The codebase carries dead code, duplicated boilerplate, and loose type safety. A full service file (`tenantSettings.service.ts`) is unused. 21 instances of `crypto.randomUUID()` + `new Date().toISOString()` boilerplate are repeated across services. tRPC routers manually thread `tenant_id: ctx.tenantId` 31 times. Commented-out enum values and `as any` type escapes litter the codebase.

**Impact:** MEDIUM — Dead code confuses developers and risks accidental use of untested paths. Boilerplate duplication increases bug surface area. `as any` casts hide real type errors.

**Solution:** Delete dead code, extract shared helpers, add a tRPC tenant_id middleware, and fix type escapes. All changes are non-behavioral — the 355 existing integration tests serve as the safety net.

---

## Scope

### Unit 1: Delete Dead `tenantSettings.service.ts`

**What:** `src/services/tenantSettings.service.ts` — all 5 exports (`createTenantSettings`, `getTenantSettings`, `updateTenantSettings`, `deleteTenantSettings`, `getOrCreateTenantSettings`) are unused by any router, agent, or test. Only referenced by:
- `src/services/index.ts` (barrel export)
- `src/db/schema.ts` (table type definition — keep this, the table may be needed for migrations)
- `tests/setup.ts` (CREATE TABLE DDL — keep this, schema setup is orthogonal to service deletion)
- `src/scripts/seed.ts` (deletes from table — keep this, defensive cleanup is fine)

**Actions:**
1. Delete `src/services/tenantSettings.service.ts`
2. Remove `export * from './tenantSettings.service'` from `src/services/index.ts`
3. Verify: `npx vitest run` — all 355 tests still pass (no test imports this service)

**Do NOT delete:**
- The `tenant_settings` table DDL in `tests/setup.ts` (needed for schema完整性)
- The `TenantSettingsTable` type in `src/db/schema.ts` (table exists in D1, removing the type would be premature)
- The seed cleanup in `src/scripts/seed.ts` (defensive, harmless)

---

### Unit 2: Extract Shared `createRecordId` and `timestamp` Helpers

**What:** The pattern `const id = crypto.randomUUID(); const now = new Date().toISOString();` appears 10 + 21 times across all service files. Extract to shared helpers.

**Actions:**
1. Create `src/services/helpers.ts`:
   ```typescript
   export function createId(): string {
     return crypto.randomUUID();
   }
   
   export function nowISO(): string {
     return new Date().toISOString();
   }
   ```
2. Update all 8 service files to import and use these helpers
3. Verify: `npx vitest run` — all tests pass unchanged

**Files to update:**
- `src/services/user.service.ts` (2 createId + 2 nowISO)
- `src/services/exerciseDictionary.service.ts` (3 createId + 5 nowISO)
- `src/services/dailyWellness.service.ts` (2 createId + 3 nowISO)
- `src/services/workoutSession.service.ts` (1 createId + 4 nowISO)
- `src/services/trainingPlan.service.ts` (1 createId + 2 nowISO)
- `src/services/trainingSession.service.ts` (1 createId + 2 nowISO)
- `src/services/sessionExercise.service.ts` (1 createId + 2 nowISO)

---

### Unit 3: Add tRPC `tenant_id` Auto-Inject Middleware

**What:** Every router procedure manually writes `tenant_id: ctx.tenantId` — 31 occurrences across 5 router files. A tRPC middleware can auto-inject this.

**Actions:**
1. Create a tRPC middleware in `src/trpc/trpc.ts` (or alongside existing middleware) that:
   - Extracts `tenantId` from context
   - Throws `UNAUTHORIZED` if `tenantId` is null
   - Merges `tenant_id: tenantId` into the input for all `protectedProcedure` calls
2. Update all 5 router files to use the middleware, removing manual `tenant_id: ctx.tenantId` lines
3. **CRITICAL:** This changes how `tenant_id` reaches service functions. Services currently receive `tenant_id` as part of their input object. The middleware must inject it into `input` so the service signature stays the same.
4. Verify: `npx vitest run` — all tests pass, especially multi-tenant isolation tests

**Files to update:**
- `src/trpc/trpc.ts` — add middleware
- `src/trpc/routers/libraryRouter.ts` (8 occurrences)
- `src/trpc/routers/trainingRouter.ts` (7 occurrences)
- `src/trpc/routers/trainingPlanRouter.ts` (6 occurrences)
- `src/trpc/routers/trainingSessionRouter.ts` (10 occurrences)
- `src/trpc/routers/wellnessRouter.ts` (0 — uses its own pattern, verify)

**Risk:** MEDIUM — This changes the input shape for all protected procedures. The 355 tests provide comprehensive coverage. If multi-tenant isolation tests pass, the injection is correct.

---

### Unit 4: Fix `as any` Type Escapes in `fate/dashboardRouter.ts`

**What:** Two `as any` casts in `src/fate/dashboardRouter.ts` at lines 97-98:
```typescript
acwrHistory: unwrapConnection((resolved as any).acwrHistory),
wellnessHistory: unwrapConnection((resolved as any).wellnessHistory),
```

**Actions:**
1. Read the Fate views to understand the expected return type
2. Create a proper typed interface for the resolved data
3. Replace `as any` with the correct type assertion or type narrowing
4. Verify: `npx vitest run` — tests pass, including `tests/fate/*.test.ts`

**Note:** The `as any` casts in `src/app/test-utils.ts` are acceptable — test utilities often need flexible typing for partial inputs. Do NOT touch those.

---

### Unit 5: Clean Up Commented-Out Enum Values

**What:** In `src/db/schema.ts` line 29, commented-out values exist:
```typescript
// 'mobility', 'warmup', 'cooldown'
```

**Actions:**
1. Verify these values are NOT used anywhere in the codebase (services, agent, seed scripts)
2. If truly unused: remove the comment entirely — clean slate
3. If referenced: uncomment and add them to the union type properly

---

## Execution Strategy

Following the project's established orchestration pattern (learned from Phases 1-3):

**Sequential approach:** Single backend engineer executes all 5 units, then tester verifies.

| Step | Agent | Task | Est. Time |
|------|-------|------|-----------|
| 1 | `backend-engineer` | Execute Units 1-5 (code changes) | 20 min |
| 2 | `tester` | Full test suite verification + targeted regression | 10 min |

**Rationale for sequential:** Units 1-5 are tightly coupled code changes. A single engineer maintains coherence. The tester runs the full 355-test suite as regression.

---

## Verification Checklist

- [ ] `tenantSettings.service.ts` deleted, barrel export removed
- [ ] All services use `createId()` / `nowISO()` from `helpers.ts`
- [ ] tRPC middleware auto-injects `tenant_id`, no manual threading
- [ ] Zero `as any` in `fate/dashboardRouter.ts`
- [ ] Commented-out enum values resolved
- [ ] `npx vitest run` — 355 tests pass (0 regressions)
- [ ] `npx tsc --noEmit` — 0 type errors
