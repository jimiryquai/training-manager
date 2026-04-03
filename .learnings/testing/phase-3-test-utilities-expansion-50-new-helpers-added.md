---
module: testing
problem_type: best_practice
tags: ["test-utils","phase-3","vitestInvoke","helpers","test-bridge"]
---
### [2026-04-03] Phase 3 Test Utilities Expansion: 50+ New Helpers Added
## Phase 3 Test Utilities Growth: 50+ New Helpers in test-utils.ts

### Context
Phase 3 added approximately 50 new `test_*` helper functions to `src/app/test-utils.ts`, bringing the total to ~60+ exported functions across 121 export lines.

### New Sections Added in Phase 3

#### Daily Wellness Helpers
- `test_createDailyWellness` — basic CRUD create
- `test_createDailyWellnessViaAgent` — creates with `data_source = 'agent'`
- `test_updateDailyWellness` — updates existing record
- `test_updateDailyWellnessViaAgent` — updates with agent data_source
- `test_deleteDailyWellness` — delete by ID
- `test_deleteDailyWellnessByDate` — delete by date + user + tenant
- `test_getDailyWellnessByDate` — fetch single record by date
- `test_getDailyWellnessByDateRange` — fetch range with date filters
- `test_getMostRecentWellness` — latest wellness for user
- `test_getAverageWellnessScores` — aggregated averages over date range

#### Workout Session Helpers
- `test_createWorkoutSession` — basic CRUD create
- `test_createWorkoutSessionViaAgent` — creates with agent data_source
- `test_updateWorkoutSession` — updates existing record
- `test_markWorkoutAsVoiceEntry` — sets voice_entry flag
- `test_getWorkoutSessionById` — fetch by ID
- `test_getWorkoutSessionsByDateRange` — range query with date filters
- `test_deleteWorkoutSession` — delete by ID

#### Wellness Router Caller Helpers
- `test_w_logDailyMetrics` — calls wellnessRouter.logDailyMetrics via createCaller
- Additional wellness router procedure helpers

#### Library Router Caller Helpers (Extended)
- `test_library_addExercise`, `test_library_getExercises`
- `test_library_saveBenchmark`, `test_library_updateExercise`
- `test_library_deleteExercise`, `test_library_getExercisesByBenchmark`
- `test_library_getSystemExercises`, `test_library_getUserBenchmark`
- `test_library_getUserBenchmarks`, `test_library_getTrainingMaxForExercise`

#### Training Plan/Session Caller Helpers
- `test_createTrainingPlan`, `test_getFullTrainingPlan`
- `test_getTrainingPlansForTenant`, `test_getTrainingPlanById`
- `test_createTrainingSession`, `test_getTrainingSessionsByPlan`
- `test_getTrainingSessionById`, `test_getTrainingSessionsByWeek`
- `test_createSessionExercise`, `test_getSessionExercisesBySession`
- `test_getSessionExerciseById`, `test_cleanTrainingPlanData`

### Organizational Convention
test-utils.ts uses section headers:
```typescript
// ============================================================================
// Daily Wellness Test Utilities
// ============================================================================
```
Keep related functions grouped under their section header. Maintain alphabetical ordering within sections where practical.

### Critical Dependency: Rebuild After Changes
After adding or modifying any `test_*` function in test-utils.ts, you MUST:
```bash
npm run build
```
The vitest worker pool reads from `dist/worker/`, not source files.
