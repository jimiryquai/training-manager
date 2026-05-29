---
module: database
problem_type: schema_migration
tags: ["session_exercise","schema","prescribed_rest","target_fields"]
---
### [2026-04-08] SessionExercise schema migration: target_* fields replaced with prescribed_rest_min/max
### [2026-04-08] Schema Migration: SessionExercise target_* fields → prescribed_rest

The `session_exercise` table has been migrated. The following fields were **removed**:
- `target_sets`, `target_reps`, `target_intensity`, `target_rpe`, `target_tempo`, `target_rest_seconds`

**Replaced with:**
- `prescribed_rest_min: number | null`
- `prescribed_rest_max: number | null`

The old learning (agent-native-flattening.md) still references the old `target_*` field names — those are now stale.

**Files that needed updating:**
- `trainingPlan.service.ts` — `exerciseInserts` type and `exerciseInserts.push()` call in `cloneTrainingPlanToTenant`
- `sessionExercise.service.ts` — `SessionExerciseRecord` type (handled by another agent)
- The DB schema definition in `schema.ts` or equivalent
