---
title: Split God Object - trainingPlan.service.ts (Phase 2 Refactor)
type: refactor
status: complete
date: 2026-04-03
origin: docs/ideation/2026-04-03-cleanup-sweep-ideation.md
depends_on: docs/plans/2026-04-03-001-fix-multi-tenancy-error-handling-plan.md
---

# Split God Object: trainingPlan.service.ts

## Overview

**Problem:** `trainingPlan.service.ts` (663 lines) handles three distinct entities in a single file:
- TrainingPlan (8 functions)
- TrainingSession (8 functions)  
- SessionExercise (6 functions)

The corresponding router (`trainingPlanRouter.ts`, 352 lines) mirrors this with 21 procedures. This violates SRP, creates merge conflict hotspots, and makes the codebase resistant to change.

**Solution:** Split into three focused service files and corresponding routers following domain-driven boundaries.

**Impact:** HIGH — Reduces cognitive load, enables focused testing, prevents merge conflicts during parallel development.

---

## Proposed Solution

### Part A: Service Layer Split

Split `src/services/trainingPlan.service.ts` into three files:

#### 1. `trainingPlan.service.ts` — Plan CRUD only (~150 lines)

| Function | Signature | Notes |
|----------|-----------|-------|
| `createTrainingPlan` | `(db, input) => Promise<TrainingPlanRecord \| undefined>` | Creates plan |
| `getTrainingPlanById` | `(db, input) => Promise<TrainingPlanRecord \| undefined>` | Single plan fetch |
| `getSystemTrainingPlans` | `(db) => Promise<TrainingPlanRecord[]>` | Global templates |
| `getTrainingPlansForTenant` | `(db, tenant_id) => Promise<TrainingPlanRecord[]>` | Tenant + system plans |
| `updateTrainingPlan` | `(db, input) => Promise<TrainingPlanRecord \| undefined>` | Update plan |
| `deleteTrainingPlan` | `(db, input) => Promise<boolean>` | Delete plan |
| `cloneTrainingPlanToTenant` | `(db, input) => Promise<TrainingPlanRecord \| undefined>` | **Cross-entity**: imports session/exercise services |
| `getFullTrainingPlan` | `(db, input) => Promise<TrainingPlanWithSessions \| undefined>` | **Cross-entity**: imports session service |

**Exports:**
```typescript
// Types
export interface CreateTrainingPlanInput { ... }
export interface GetTrainingPlanInput { ... }
export interface UpdateTrainingPlanInput { ... }
export interface DeleteTrainingPlanInput { ... }
export type TrainingPlanRecord = { ... }
export interface TrainingPlanWithSessions extends TrainingPlanRecord {
  sessions: TrainingSessionWithExercises[];
}

// Functions
export function createTrainingPlan(...)
export function getTrainingPlanById(...)
export function getSystemTrainingPlans(...)
export function getTrainingPlansForTenant(...)
export function updateTrainingPlan(...)
export function deleteTrainingPlan(...)
export function cloneTrainingPlanToTenant(...)
export function getFullTrainingPlan(...)
```

#### 2. `trainingSession.service.ts` — Session CRUD (~200 lines)

| Function | Signature | Notes |
|----------|-----------|-------|
| `createTrainingSession` | `(db, input) => Promise<TrainingSessionRecord \| undefined>` | Creates session |
| `getTrainingSessionById` | `(db, input) => Promise<TrainingSessionRecord \| undefined>` | Single session |
| `getTrainingSessionsByPlan` | `(db, input) => Promise<TrainingSessionRecord[]>` | All sessions for plan |
| `getTrainingSessionsByWeek` | `(db, input) => Promise<TrainingSessionRecord[]>` | Filtered by week |
| `updateTrainingSession` | `(db, input) => Promise<TrainingSessionRecord \| undefined>` | Update session |
| `deleteTrainingSession` | `(db, input) => Promise<boolean>` | Delete session |
| `getFullTrainingSession` | `(db, input) => Promise<TrainingSessionWithExercises \| undefined>` | **Cross-entity**: imports exercise service |

**Exports:**
```typescript
// Types
export interface CreateTrainingSessionInput { ... }
export interface GetTrainingSessionInput { ... }
export interface GetTrainingSessionsByPlanInput { ... }
export interface GetTrainingSessionsByWeekInput { ... }
export interface UpdateTrainingSessionInput { ... }
export interface DeleteTrainingSessionInput { ... }
export type TrainingSessionRecord = { ... }
export interface TrainingSessionWithExercises extends TrainingSessionRecord {
  exercises: SessionExerciseRecord[];
}

// Functions
export function createTrainingSession(...)
export function getTrainingSessionById(...)
export function getTrainingSessionsByPlan(...)
export function getTrainingSessionsByWeek(...)
export function updateTrainingSession(...)
export function deleteTrainingSession(...)
export function getFullTrainingSession(...)
```

#### 3. `sessionExercise.service.ts` — Exercise Set Operations (~180 lines)

| Function | Signature | Notes |
|----------|-----------|-------|
| `createSessionExercise` | `(db, input) => Promise<SessionExerciseRecord \| undefined>` | Create exercise |
| `getSessionExerciseById` | `(db, input) => Promise<SessionExerciseRecord \| undefined>` | Single exercise |
| `getSessionExercisesBySession` | `(db, input) => Promise<SessionExerciseRecord[]>` | All exercises for session |
| `getSessionExercisesGrouped` | `(db, input) => Promise<Map<string \| null, SessionExerciseRecord[]>>` | Grouped by circuit |
| `updateSessionExercise` | `(db, input) => Promise<SessionExerciseRecord \| undefined>` | Update exercise |
| `deleteSessionExercise` | `(db, input) => Promise<boolean>` | Delete exercise |

**Exports:**
```typescript
// Types
export interface CreateSessionExerciseInput { ... }
export interface GetSessionExerciseInput { ... }
export interface GetSessionExercisesBySessionInput { ... }
export interface UpdateSessionExerciseInput { ... }
export interface DeleteSessionExerciseInput { ... }
export type SessionExerciseRecord = { ... }

// Functions
export function createSessionExercise(...)
export function getSessionExerciseById(...)
export function getSessionExercisesBySession(...)
export function getSessionExercisesGrouped(...)
export function updateSessionExercise(...)
export function deleteSessionExercise(...)
```

### Part B: Router Layer Split

Split `trainingPlanRouter.ts` into two routers:

#### 1. `trainingPlanRouter.ts` — Plan procedures only (~130 lines)

| Procedure | Type | Maps to Service |
|-----------|------|-----------------|
| `createPlan` | mutation | `trainingPlan.createTrainingPlan` |
| `getPlan` | query | `trainingPlan.getTrainingPlanById` |
| `getSystemPlans` | query | `trainingPlan.getSystemTrainingPlans` |
| `getPlansForTenant` | query | `trainingPlan.getTrainingPlansForTenant` |
| `updatePlan` | mutation | `trainingPlan.updateTrainingPlan` |
| `deletePlan` | mutation | `trainingPlan.deleteTrainingPlan` |
| `clonePlan` | mutation | `trainingPlan.cloneTrainingPlanToTenant` |
| `getFullPlan` | query | `trainingPlan.getFullTrainingPlan` |

#### 2. `trainingSessionRouter.ts` — Session + Exercise procedures (~220 lines)

| Procedure | Type | Maps to Service |
|-----------|------|-----------------|
| `createSession` | mutation | `trainingSession.createTrainingSession` |
| `getSession` | query | `trainingSession.getTrainingSessionById` |
| `getSessionsByPlan` | query | `trainingSession.getTrainingSessionsByPlan` |
| `getSessionsByWeek` | query | `trainingSession.getTrainingSessionsByWeek` |
| `updateSession` | mutation | `trainingSession.updateTrainingSession` |
| `deleteSession` | mutation | `trainingSession.deleteTrainingSession` |
| `getFullSession` | query | `trainingSession.getFullTrainingSession` |
| `createExercise` | mutation | `sessionExercise.createSessionExercise` |
| `getExercise` | query | `sessionExercise.getSessionExerciseById` |
| `getExercisesBySession` | query | `sessionExercise.getSessionExercisesBySession` |
| `getExercisesGrouped` | query | `sessionExercise.getSessionExercisesGrouped` |
| `updateExercise` | mutation | `sessionExercise.updateSessionExercise` |
| `deleteExercise` | mutation | `sessionExercise.deleteSessionExercise` |

**Rationale for combined session+exercise router:** Exercises have no meaning outside a session context. Keeping them together maintains the natural hierarchy (Plan → Session → Exercise).

### Part C: Cross-Entity Import Structure

```
trainingPlan.service.ts
├── imports: trainingSession.service (for clone, getFull)
└── exports: plan types + functions

trainingSession.service.ts
├── imports: sessionExercise.service (for getFull)
└── exports: session types + functions

sessionExercise.service.ts
├── imports: none
└── exports: exercise types + functions
```

**Dependency direction:** Plan → Session → Exercise (unidirectional, no cycles)

---

## Technical Considerations

### Architecture Impacts

1. **No schema changes** — This is purely code reorganization
2. **Multi-tenancy preserved** — All tenant_id filters remain intact (as fixed in Phase 1)
3. **Error handling preserved** — `wrapDatabaseError` wrapper remains on all functions

### Import Impact Analysis

**Current consumers of `trainingPlan.service.ts`:**
| File | Change Required |
|------|-----------------|
| `src/trpc/routers/trainingPlanRouter.ts` | Split imports across new service files |
| `src/services/index.ts` | Add exports for 2 new service files |
| `scripts/seed.ts` | Update imports (if exists) |

**Current consumers of `trainingPlanRouter.ts`:**
| File | Change Required |
|------|-----------------|
| `src/trpc/appRouter.ts` | Add `trainingSession` router to root |
| `src/trpc/routers/index.ts` | Export new router |

### Breaking Changes

**tRPC API Paths Change:**
```
Before: trainingPlan.createSession
After:  trainingSession.createSession

Before: trainingPlan.createExercise  
After:  trainingSession.createExercise
```

**Migration Required:**
- Frontend code calling `trainingPlan.createSession` → `trainingSession.createSession`
- Frontend code calling `trainingPlan.getExercisesBySession` → `trainingSession.getExercisesBySession`

**Mitigation:** This is an internal tool; coordinate deploy with frontend update. No public API consumers.

### Test File Organization

**Current:** `tests/services/trainingPlan.service.test.ts` (13,723 bytes, multi-tenancy tests)

**Proposed Split:**
| File | Scope |
|------|-------|
| `tests/services/trainingPlan.service.test.ts` | Plan multi-tenancy tests |
| `tests/services/trainingSession.service.test.ts` | Session multi-tenancy tests |
| `tests/services/sessionExercise.service.test.ts` | Exercise multi-tenancy tests |

**Alternative:** Keep combined test file and update imports. Tests verify behavior, not file structure.

---

## Acceptance Criteria

### Service Layer
- [ ] `trainingPlan.service.ts` contains only plan-related functions (8 exports)
- [ ] `trainingSession.service.ts` contains only session-related functions (7 exports)
- [ ] `sessionExercise.service.ts` contains only exercise-related functions (6 exports)
- [ ] Cross-entity imports use explicit file paths (no circular dependencies)
- [ ] `src/services/index.ts` exports all three services
- [ ] All services use `wrapDatabaseError` from `./errors`
- [ ] All multi-tenant filter patterns preserved

### Router Layer
- [ ] `trainingPlanRouter.ts` contains only plan procedures (8 procedures)
- [ ] `trainingSessionRouter.ts` contains session + exercise procedures (13 procedures)
- [ ] `appRouter.ts` includes both routers at root level
- [ ] `src/trpc/routers/index.ts` exports both routers
- [ ] All procedures maintain `protectedProcedure` wrapper
- [ ] Zod schemas colocated with router

### Tests
- [ ] Existing multi-tenancy tests pass with new imports
- [ ] Test file imports updated to use correct service files
- [ ] No reduction in test coverage

### Documentation
- [ ] This plan document marked as complete
- [ ] Update `services/index.ts` comments if needed

---

## Implementation Units

### Unit 1: Create sessionExercise.service.ts
**Goal:** Extract exercise functions to standalone file
**Files:**
- `src/services/sessionExercise.service.ts` (create)
- `src/services/index.ts` (modify - add export)

**Extracted functions:**
- `createSessionExercise`
- `getSessionExerciseById`
- `getSessionExercisesBySession`
- `getSessionExercisesGrouped`
- `updateSessionExercise`
- `deleteSessionExercise`

**Extracted types:**
- `CreateSessionExerciseInput`
- `GetSessionExerciseInput`
- `GetSessionExercisesBySessionInput`
- `UpdateSessionExerciseInput`
- `DeleteSessionExerciseInput`
- `SessionExerciseRecord`

---

### Unit 2: Create trainingSession.service.ts
**Goal:** Extract session functions to standalone file
**Files:**
- `src/services/trainingSession.service.ts` (create)
- `src/services/index.ts` (modify - add export)

**Extracted functions:**
- `createTrainingSession`
- `getTrainingSessionById`
- `getTrainingSessionsByPlan`
- `getTrainingSessionsByWeek`
- `updateTrainingSession`
- `deleteTrainingSession`
- `getFullTrainingSession`

**Extracted types:**
- `CreateTrainingSessionInput`
- `GetTrainingSessionInput`
- `GetTrainingSessionsByPlanInput`
- `GetTrainingSessionsByWeekInput`
- `UpdateTrainingSessionInput`
- `DeleteTrainingSessionInput`
- `TrainingSessionRecord`
- `TrainingSessionWithExercises`

**Dependencies:** Imports `SessionExerciseRecord` from `./sessionExercise.service`

---

### Unit 3: Refactor trainingPlan.service.ts
**Goal:** Remove extracted code, add cross-service imports
**Files:**
- `src/services/trainingPlan.service.ts` (modify - reduce to plan-only)

**Remaining functions:**
- `createTrainingPlan`
- `getTrainingPlanById`
- `getSystemTrainingPlans`
- `getTrainingPlansForTenant`
- `updateTrainingPlan`
- `deleteTrainingPlan`
- `cloneTrainingPlanToTenant`
- `getFullTrainingPlan`

**Remaining types:**
- `CreateTrainingPlanInput`
- `GetTrainingPlanInput`
- `UpdateTrainingPlanInput`
- `DeleteTrainingPlanInput`
- `TrainingPlanRecord`
- `TrainingPlanWithSessions`

**New dependencies:** 
- Import session functions from `./trainingSession.service`
- Import exercise functions from `./sessionExercise.service`

---

### Unit 4: Create trainingSessionRouter.ts
**Goal:** Extract session + exercise procedures to new router
**Files:**
- `src/trpc/routers/trainingSessionRouter.ts` (create)
- `src/trpc/routers/index.ts` (modify - add export)
- `src/trpc/appRouter.ts` (modify - add router to root)

**Extracted procedures (13):**
- `createSession`, `getSession`, `getSessionsByPlan`, `getSessionsByWeek`
- `updateSession`, `deleteSession`, `getFullSession`
- `createExercise`, `getExercise`, `getExercisesBySession`
- `getExercisesGrouped`, `updateExercise`, `deleteExercise`

**Extracted schemas:**
- All session-related Zod schemas
- All exercise-related Zod schemas

---

### Unit 5: Refactor trainingPlanRouter.ts
**Goal:** Remove extracted procedures, update imports
**Files:**
- `src/trpc/routers/trainingPlanRouter.ts` (modify - reduce to plan-only)

**Remaining procedures (8):**
- `createPlan`, `getPlan`, `getSystemPlans`, `getPlansForTenant`
- `updatePlan`, `deletePlan`, `clonePlan`, `getFullPlan`

**Remaining schemas:**
- Plan-related Zod schemas only

---

### Unit 6: Update test imports
**Goal:** Ensure tests pass with new service structure
**Files:**
- `tests/services/trainingPlan.service.test.ts` (modify - update imports)

**Changes:**
- Import session functions from `trainingSession.service`
- Import exercise functions from `sessionExercise.service`
- Verify all existing tests pass

---

### Unit 7: Update frontend tRPC calls
**Goal:** Migrate frontend to new router paths
**Files:**
- All frontend files using `trpc.trainingPlan.createSession` etc.

**Migration mapping:**
```typescript
// Before → After
trpc.trainingPlan.createSession       → trpc.trainingSession.createSession
trpc.trainingPlan.getSession          → trpc.trainingSession.getSession
trpc.trainingPlan.getSessionsByPlan   → trpc.trainingSession.getSessionsByPlan
trpc.trainingPlan.getSessionsByWeek   → trpc.trainingSession.getSessionsByWeek
trpc.trainingPlan.updateSession       → trpc.trainingSession.updateSession
trpc.trainingPlan.deleteSession       → trpc.trainingSession.deleteSession
trpc.trainingPlan.getFullSession      → trpc.trainingSession.getFullSession
trpc.trainingPlan.createExercise      → trpc.trainingSession.createExercise
trpc.trainingPlan.getExercise         → trpc.trainingSession.getExercise
trpc.trainingPlan.getExercisesBySession → trpc.trainingSession.getExercisesBySession
trpc.trainingPlan.getExercisesGrouped → trpc.trainingSession.getExercisesGrouped
trpc.trainingPlan.updateExercise      → trpc.trainingSession.updateExercise
trpc.trainingPlan.deleteExercise      → trpc.trainingSession.deleteExercise
```

---

## Sources & References

- **Origin document:** `docs/ideation/2026-04-03-cleanup-sweep-ideation.md` (Idea #1)
- **Prerequisite:** `docs/plans/2026-04-03-001-fix-multi-tenancy-error-handling-plan.md` (Phase 1)
- **AGENTS.md constraints:** 
  - Use Kysely (no Drizzle/Prisma)
  - Multi-tenancy with `tenant_id` for data isolation
- **Institutional learnings:**
  - `service_layer/multi-tenancy-filter-patterns-in-service-layer.md`
  - `error-handling/serviceerror-typed-error-system.md`
