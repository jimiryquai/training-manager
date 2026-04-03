# Codebase Cleanup Sweep — Ideation Report
**Date:** 2026-04-03
**Scope:** Technical debt, Cloudflare edge cases, God objects, test coverage
**Method:** 3 parallel scanner agents (tech-debt, edge-case, test-coverage)

---

## Executive Summary

The codebase has **3 God objects** (>500 lines each), **23+ dead exports**, **8 HIGH-severity edge cases**, and **19 coverage gaps** across services, routers, and the agent. The good news: D1 variable limits are respected, no TODO/FIXME markers litter the code, and 71 integration tests already pass with real D1. The bad news: 2 entire tRPC routers have zero tests, a whole service (`tenantSettings`) is unused, and the CoachAgent has unauthenticated WebSocket paths and no error handling in services.

---

## SURVIVING IDEAS (Adversarially Filtered — Top 5)

### 1. 🏋️ Split God Object: `trainingPlan.service.ts` (601 lines)

**Context/Observation:**
`trainingPlan.service.ts` is a single file handling three distinct entities: TrainingPlan (8 functions), TrainingSession (8 functions), and SessionExercise (5 functions). The corresponding router (`trainingPlanRouter.ts`, 349 lines) mirrors this with 21 procedures. This violates SRP and makes the codebase resistant to change — any modification to sessions risks breaking plans.

**Proposed Improvement:**
Split into three service files:
- `trainingPlan.service.ts` — plan CRUD only
- `trainingSession.service.ts` — session CRUD
- `sessionExercise.service.ts` — exercise set operations

Split the router similarly:
- `trainingPlanRouter.ts` — plan procedures
- `trainingSessionRouter.ts` — session + exercise procedures

**Estimated Impact:** HIGH — Reduces cognitive load, enables focused testing, prevents merge conflicts in parallel development.

---

### 2. 🔒 Harden Multi-Tenancy & Error Handling (8 HIGH-severity edge cases)

**Context/Observation:**
Found 8 HIGH-severity Cloudflare/D1 edge cases:
1. **Missing `tenant_id` filters** in `trainingPlan.service.ts` queries (plans queryable cross-tenant)
2. **Unauthenticated WebSocket path** in `CoachAgent.ts` — agent accepts connections without session validation
3. **Zero error handling** across all service files — D1 query failures throw unhandled
4. **Non-null assertion on potentially-undefined** tenant settings (runtime crash path)
5. **Missing CORS headers** on tRPC endpoint
6. **TOCTOU race conditions** in upsert functions (read-then-write without transactions)
7. **Agent route bypassing auth middleware** in worker
8. **Hardcoded dev credentials** in `worker.tsx` auth bypass (`seed-user-001:seed-tenant-001`)

**Proposed Improvement:**
Phase 1 (Critical):
- Add `tenant_id` filters to all training plan queries
- Add session validation to CoachAgent WebSocket `onConnect`
- Gate hardcoded auth bypass behind `NODE_ENV === 'development'`
- Add try/catch with typed error responses in all service functions

Phase 2 (Important):
- Wrap upsert operations in D1 batch transactions to eliminate TOCTOU
- Add CORS middleware to tRPC handler
- Extract ACWR thresholds (1.5, 0.8, 1.3, 7, 28) to named constants/config

**Estimated Impact:** HIGH — Multi-tenant data leakage is a P0 security issue. Unhandled D1 errors cause 500s in production.

---

### 3. 🧪 Close Critical Test Gaps (2 routers + 2 services with ZERO tests)

**Context/Observation:**
71 integration tests pass for 3 services, but major gaps exist:
- **`user.service.ts`** — 10 exported functions, **ZERO tests** (P0)
- **`exerciseDictionary.service.ts`** — 18 exported functions, **ZERO direct tests** (P0)
- **`trainingRouter.ts`** — 7 procedures, **NO test file** (P0)
- **`trainingPlanRouter.ts`** — 20 procedures, **NO test file** (P0)
- **`wellnessRouter.test.ts`** — uses **mocked DB** (violates AGENTS.md anti-mock rule)
- **`libraryRouter.test.ts`** — only 3/11 procedures tested
- **CoachAgent** — `handleChatMessage()`, `onStart()`, tool routing all untested

**Proposed Improvement:**
Priority order (following anti-mock rule, using Test Bridge):
1. `user.service.test.ts` — CRUD + multi-tenant isolation for all 10 functions
2. `exerciseDictionary.test.ts` — CRUD + `calculateTrainingMax` + benchmarks
3. `trainingRouter.test.ts` — all 7 procedures via `vitestInvoke`
4. `trainingPlanRouter.test.ts` — all 20 procedures via `vitestInvoke`
5. Rewrite `wellnessRouter.test.ts` to use real D1 (remove mocks)

**Estimated Impact:** HIGH — 2 untested routers means 27 tRPC procedures have zero verification. One malformed request could take down the workout logging pipeline.

---

### 4. 🧹 Purge Dead Code & Extract Shared Patterns

**Context/Observation:**
The codebase carries significant dead weight:
- **`tenantSettings.service.ts`** — all 5 exports are unused. Entire file is dead code.
- **23 unused service exports** across `user.service.ts` (7), `exerciseDictionary.service.ts` (7), `acwr.service.ts` (3), `dailyWellness.service.ts` (1), `workoutSession.service.ts` (1)
- **CRUD boilerplate duplication** — `crypto.randomUUID()` + `new Date().toISOString()` repeated 21 times across services
- **tRPC tenant_id threading** — `tenant_id: ctx.tenantId` manually passed 30+ times across routers
- **Commented-out enum values** in `schema.ts` (`mobility`, `warmup`, `cooldown`)
- **`as any` type escapes** in `fate/dashboardRouter.ts` (2x) indicating broken view types

**Proposed Improvement:**
1. Delete `tenantSettings.service.ts` (or mark `@deprecated` if planned for future)
2. Remove unused exports or prefix with `_` if kept for internal use
3. Extract shared `createRecord` helper for UUID + timestamp generation
4. Create tRPC middleware that auto-injects `tenant_id` from context
5. Fix Fate view types to eliminate `as any` casts
6. Decide on commented-out exercise types: implement or remove

**Estimated Impact:** MEDIUM — Reduces bundle size, eliminates confusion, and prevents accidental use of untested dead code paths.

---

### 5. 🤖 Extract CoachAgent Tool Handlers (575-line God Object)

**Context/Observation:**
`CoachAgent.ts` handles 7+ distinct concerns in one file:
- WebSocket lifecycle (connect, disconnect, message routing)
- DB initialization (table creation on `onStart`)
- AI/OpenAI integration (response generation, streaming)
- **8+ inline tool handlers** with business logic (log_workout, log_wellness, get_plan, etc.)
- Conversation history management + pruning
- Persona management
- State persistence
- Console.log throughout (no structured logging)

Each tool handler contains inline SQL queries and business logic that should live in the service layer. This makes the agent impossible to unit test and creates tight coupling between AI orchestration and data persistence.

**Proposed Improvement:**
1. Extract tool handlers to `src/agent/tools/` — one file per tool category:
   - `workoutTools.ts` — `log_workout`, `update_workout`, etc.
   - `wellnessTools.ts` — `log_wellness`, `update_wellness`
   - `planTools.ts` — `get_plan`, `update_plan`
   - `libraryTools.ts` — `search_exercises`, etc.
2. Each tool handler calls the existing service layer (no inline SQL)
3. Add structured logging utility (replace `console.log`)
4. This naturally enables testing: tool handlers can be integration-tested independently

**Estimated Impact:** MEDIUM-HIGH — Doesn't change runtime behavior but dramatically improves testability, maintainability, and enables parallel development on agent features.

---

## Non-Surviving Ideas (Filtered Out)

| Idea | Why Rejected |
|------|-------------|
| Refactor all UI form components to shared `FormDialog` | Low leverage — UI duplication isn't blocking feature work |
| Replace `console.log` with structured logger across entire codebase | Better addressed as part of CoachAgent extraction (Idea #5) |
| Make ACWR thresholds tenant-configurable | Premature — constants are fine until multi-tenant customization is requested |
| Add rate limiting to tRPC mutations | Low priority — internal tool, no public API exposure yet |
| Extract seed script mapping tables to config files | Seed scripts are disposable; not worth the refactor cost |

---

## Recommended Execution Order

| Phase | Tasks | Dependencies |
|-------|-------|-------------|
| **Phase 1** (Week 1) | Idea #2 — Multi-tenancy hardening + error handling | None (security-critical) |
| **Phase 2** (Week 1-2) | Idea #1 — Split `trainingPlan.service.ts` | None |
| **Phase 3** (Week 2) | Idea #3 — Close test gaps (user, exercise, routers) | Depends on Phase 2 (new service files need tests) |
| **Phase 4** (Week 3) | Idea #4 — Purge dead code | After Phase 3 (dead exports confirmed unused by tests) |
| **Phase 5** (Week 3-4) | Idea #5 — Extract CoachAgent tools | After Phase 4 (clean service layer to target) |

---

## Appendix: Raw Scan Data

- **Tech Debt Scanner**: 12 HIGH, 10 MEDIUM, 4 LOW findings across 5 categories
- **Edge Case Scanner**: 8 HIGH, 15 MEDIUM, 2 LOW findings across 6 categories
- **Test Coverage Scanner**: 19 coverage gaps across P0/P1/P2 tiers
