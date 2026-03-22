---
module: testing_framework
problem_type: test_failure
tags: ["vitest", "durable_objects", "agents", "vitestInvoke"]
---
### [2026-03-21] Cloudflare Agent/Durable Object Testing with vitestInvoke
When testing Cloudflare Agents (Durable Objects) with the RedwoodSDK `vitestInvoke` pattern:

1. **Cannot import from agent modules directly** - The vitest worker context runs in a Cloudflare Worker runtime. Importing from agent files that use `agents` package causes module resolution issues (`ajv` export errors). Define test constants inline instead.

2. **Test utilities must be exported from test-utils.ts** - All test functions called via `vitestInvoke` must be exported from `src/app/test-utils.ts`. After adding new utilities, rebuild with `pnpm run build` before running tests.

3. **Foreign Key constraints require user records** - Tables like `user_benchmarks` have FK constraints to `user`. Always create a test user first:
   ```typescript
   await vitestInvoke('test_createUser', {
     id: TEST_USER,
     email: 'test@example.com',
     tenant_id: TEST_TENANT,
   });
   ```

4. **Test agent logic via service functions** - Since WebSocket connections can't be tested directly with vitestInvoke, test the underlying service functions that the agent tools call. Create wrapper utilities in test-utils.ts that call the same services.

5. **State validation can be tested separately** - Extract state validation logic into pure functions in test-utils.ts to test state management without needing a real agent instance.

6. **Multi-tenancy isolation** - Always test that data is properly isolated between tenants, especially for agent tools that query by tenant_id and user_id.
