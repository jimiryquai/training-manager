---
module: services
problem_type: best_practice
tags: ["user-service","test-utils","vitestInvoke","multi-tenant"]
---
### [2026-04-03] User Service Test Utilities Pattern
### User Service Test Utilities Pattern (test-utils.ts)

When adding service test utilities to `src/app/test-utils.ts`:

1. **Import service functions directly** and pass `getDb()` to them:
```typescript
import { getUserById } from "../services/user.service";
export async function test_getUserById(input) {
    const db = getDb();
    return await getUserById(db, input);
}
```

2. **Extend `test_cleanDatabase`** to also clean the `user` table (added `await db.deleteFrom('user').where('tenant_id', '=', tenantId).execute()`).

3. **Handle aliased imports** when service names conflict with test-utils function names:
```typescript
import { deactivateUser as deactivateUserService } from "../services/user.service";
```

4. **Multi-tenant isolation pattern**: Every test file should use two tenants (TENANT_A, TENANT_B), clean both in beforeEach, and verify cross-tenant operations return undefined/false.

5. **Test count**: User service has 10 exported functions. With CRUD + multi-tenant isolation tests, expect ~30-32 tests.
