---
module: database
problem_type: best_practice
tags: ["kysely","d1","migration","exercise_set","bioenergetic_limiter"]
---
### [2026-04-08] Migration 0008: Bioenergetic Limiter + ExerciseSet + SessionExercise Macro Prescription
## Migration 0008: Three-Part Architectural Change

### Changes Made:
1. **User Table**: Added `bioenergetic_limiter TEXT` (nullable) — values: 'Delivery', 'Respiratory', 'Utilization'
2. **SessionExercise Table**: Removed 6 target_* fields, added `prescribed_rest_min`/`prescribed_rest_max` (Compliance Boundary rest range). Uses SQLite table recreation pattern.
3. **ExerciseSet Table**: NEW child table for set-by-set precision. Fields: conversion_factor, prescribed_reps_min/max, prescribed_weight, actual_reps, actual_weight, actual_rest_seconds, rpe, is_voice_entry, is_completed.

### Cascade Impact (files that needed updating):
- `src/db/schema.ts` — Kysely types (Database interface, ExerciseSetTable, InsertableExerciseSet)
- `src/services/sessionExercise.service.ts` — Input/Record types, create/update functions
- `src/services/trainingPlan.service.ts` — cloneTrainingPlanToTenant exerciseInserts type and field refs
- `src/services/exerciseDictionary.service.ts` — Added percent_bodyweight_used, rounding_increment to Record/Input/create
- `src/app/test-utils.ts` — test_createSessionExercise input type
- `src/scripts/seed.ts` — createSessionExercise call arguments

### Key Pattern:
When a migration removes columns via SQLite table recreation, the cascade to service files follows this chain:
1. Kysely schema types change
2. Service Record/Input types must match new schema
3. All insert/update `.values()` calls must use new field names
4. Clone functions with explicit type annotations must update their inline types
5. Test utilities and seed scripts must be updated
6. ExerciseDictionary had a pre-existing issue: `percent_bodyweight_used` and `rounding_increment` were added to the table in migration 0007 but never added to the service Record type — migration 0008 work surfaced this debt.
