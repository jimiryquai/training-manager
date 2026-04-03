---
module: testing
problem_type: best_practice
tags: ["exercise-dictionary","vitest","integration-tests","multi-tenant","benchmarks"]
---
### [2026-04-03] Exercise Dictionary Integration Test Pattern
### Exercise Dictionary Service Test Pattern (2026-04-03)

When testing the exercise dictionary and user benchmarks services:

**1. User FK Constraints**
- `user_benchmarks` has `FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE`
- Always create test users in `beforeEach` before creating benchmarks
- Use `test_createUser` to create users with proper tenant isolation

**2. Multi-Tenant Isolation Tests**
- Use two separate tenants (TENANT_A, TENANT_B) to verify isolation
- Test that exercises from one tenant are not visible to another via `getExercisesForTenant`
- Test that update/delete operations filter by tenant_id
- System exercises (tenant_id = null) should be visible to all tenants

**3. Training Max Calculation**
- `calculateTrainingMax` is a pure function: `value * (percentage / 100)`
- `getTrainingMaxForExercise` is composite: looks up exercise → benchmark → applies conversion factor
- Test the conversion factor multiplication: `trainingMax * conversion_factor`

**4. Test Utilities Added to test-utils.ts**
- `test_getExerciseById`, `test_getExercisesByCategory`, `test_getExercisesByBenchmarkTarget`
- `test_getSystemExercises`, `test_getExercisesForTenant`
- `test_updateExercise`, `test_deleteExercise`
- `test_createUserBenchmark`, `test_getUserBenchmark`, `test_updateUserBenchmark`
- `test_deleteUserBenchmark`, `test_deleteUserBenchmarkByName`, `test_getUserBenchmarkById`
- `test_calculateTrainingMax`, `test_getTrainingMaxForExercise`

**5. Cleanup Pattern**
Extended `test_cleanDatabase` to also clean:
- `session_exercise`, `training_session`, `training_plan` (in dependency order)
- `user` table (after user_benchmarks due to FK cascade)

**6. Upsert vs Create**
- `test_upsertUserBenchmark` is a raw DB utility that doesn't support `training_max_percentage`
- Use `test_createUserBenchmark` when you need to set `training_max_percentage` explicitly
- The raw upsert utility preserves existing fields on update (doesn't SET them)

