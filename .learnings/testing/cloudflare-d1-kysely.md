---
module: testing_framework
problem_type: best_practice
tags: ["cloudflare", "d1", "kysely", "integration_testing"]
---
### [2026-03-21] Cloudflare D1 + Kysely Integration Testing Pattern
When writing integration tests for Cloudflare D1 with Kysely, you MUST:

1. **Synchronize test schema with production migrations**
   - The `tests/setup.ts` SCHEMA constant must EXACTLY match all columns from migrations
   - Missing columns cause "table has no column named" errors
   - Run `cat src/db/migrations/*.sql` to see the full schema

2. **Use the RedwoodSDK Test Bridge pattern**
   - Add test utilities to `src/app/test-utils.ts` that call real services with `getDb()`
   - Register the `/_test` route in worker: `route("/_test", { post: ({ request }) => handleVitestRequest(request, testUtils) })`
   - Tests use `vitestInvoke('test_functionName', input)` to call real D1 operations

3. **Respect SQLite CHECK constraints in test data**
   - Wellness scores: 1-5 (not 1-10!)
   - sRPE: 1-10
   - Durations: must be positive integers
   - UNIQUE constraints on (tenant_id, user_id, date) require unique dates per test

4. **Test multi-tenant isolation explicitly**
   - Verify cross-tenant reads return empty/undefined
   - Verify cross-tenant updates/deletes return false/undefined
   - Use separate tenant IDs to verify isolation

5. **Clean database between tests**
   - Call `test_cleanDatabase(tenantId)` in `beforeEach()`
   - This prevents test pollution and UNIQUE constraint violations
