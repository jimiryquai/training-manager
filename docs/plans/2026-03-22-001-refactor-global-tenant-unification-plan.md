---
title: Unify Global Tenant ID Usage
type: refactor
status: active
date: 2026-03-22
---

# Unify Global Tenant ID Usage

## Overview
Currently, the "Hybrid Multi-Tenant" pattern is inconsistently applied across the training plan hierarchy. While `training_plan` and `exercise_dictionary` correctly allow `tenant_id: null` for global system templates, the child tables (`training_session` and `session_exercise`) have `NOT NULL` constraints. This has led to the use of a magic string `'SYSTEM'` in recent architecture proof tests, which violates the `AGENTS.md` standard.

## Proposed Solution
Unify the hierarchy by allowing `tenant_id` to be `null` across all training-related tables. This ensures that global templates are truly global and avoids magic strings for data isolation.

## Technical Considerations
- **Architecture impacts**: Ensures vertical consistency in the training plan hierarchy.
- **Schema changes**: `training_session` and `session_exercise` tables need `tenant_id` to be nullable in both SQLite (D1) and Kysely interfaces.
- **Security/Performance considerations**: Existing indices on `tenant_id` should handle `null` values correctly in SQLite.

## Acceptance Criteria
- [ ] Database migration created to make `tenant_id` nullable in `training_session` and `session_exercise`.
- [ ] `src/db/schema.ts` updated to reflect nullable `tenant_id`.
- [ ] `src/services/trainingPlan.service.ts` updated to allow `null` for `tenant_id` in creation and query functions.
- [ ] `tests/integration/architectureProof.test.ts` refactored to use `null` instead of `'SYSTEM'`.
- [ ] All tests pass.

## Implementation Units
1. [Migration]: Create `0008_make_training_tenant_id_nullable.sql` to recreate tables with nullable columns. -> `src/db/migrations/0008_make_training_tenant_id_nullable.sql`
2. [Schema]: Update `TrainingSessionTable` and `SessionExerciseTable` in `src/db/schema.ts`. -> `src/db/schema.ts`
3. [Service]: Update `TrainingPlanService` methods to accept `string | null` for `tenant_id`. -> `src/services/trainingPlan.service.ts`
4. [Verification]: Update `architectureProof.test.ts` and run full suite. -> `tests/integration/architectureProof.test.ts`

## Sources & References
- **Standard:** `AGENTS.md:L11` ("Allow `NULL` only for global system templates.")
- **Current Issue:** `tests/integration/architectureProof.test.ts:L51`
