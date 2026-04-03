---
module: testing
problem_type: best_practice
tags: ["library-router","vitestInvoke","test-utilities","multi-tenant"]
---
### [2026-04-03] Library router test utilities require matching userId across utilities
## Library Router Test Utilities Pattern

### Key Insight
The library router test utilities (`test_library_*`) all use a hardcoded `'test-user'` userId in the createCaller context. This means:

1. **Benchmark tests** that use `test_library_saveBenchmark`, `test_library_getUserBenchmark`, etc. all share the same `'test-user'` context. You MUST create a user with `id: 'test-user'` via `test_createUser` before using any benchmark utilities.

2. **Multi-tenant benchmark isolation tests** CANNOT use `test_library_saveBenchmark` for both tenants because it always uses `'test-user'` as the userId. Instead, use the direct service utility `test_upsertUserBenchmark` which accepts an explicit `user_id` parameter, and verify with `test_getUserBenchmarks` (also accepts `user_id`).

3. **getUserBenchmark returns undefined (not null)** when no record found - the tRPC router passes through the raw Kysely result.

4. **test_library_saveBenchmark** must accept `training_max_percentage` for training max tests that need non-100% percentages.

### Build Step Required
After adding new test utilities to `src/app/test-utils.ts`, you MUST run `npm run build` before tests can see them via `vitestInvoke`. The test bridge runs against the built worker output in `dist/worker/`.
