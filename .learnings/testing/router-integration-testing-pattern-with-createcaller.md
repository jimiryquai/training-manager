---
module: testing
problem_type: best_practice
tags: ["trpc","router","createCaller","vitest","test-utils"]
---
### [2026-04-03] Router Integration Testing Pattern with createCaller
## Pattern for Testing tRPC Routers with Real D1

### Overview
When testing tRPC routers, use the `createCaller` pattern directly in test utilities to create authenticated contexts. This follows the libraryRouter.test.ts pattern and avoids the need for service-level abstractions.

### Implementation

1. **Add test utilities in `src/app/test-utils.ts`:**
```typescript
import { trainingPlanRouter } from '../trpc/routers/trainingPlanRouter';

function createTrainingPlanCaller(tenantId: string, userId: string = 'test-user') {
    const db = getDb();
    return trainingPlanRouter.createCaller({
        session: { userId, tenantId },
        tenantId,
        userId,
        db,
    });
}

export async function test_tp_createPlan(input: {
    tenant_id: string;
    name: string;
    is_system_template?: boolean;
}) {
    const caller = createTrainingPlanCaller(input.tenant_id);
    return await caller.createPlan({
        name: input.name,
        is_system_template: input.is_system_template,
    });
}
```

2. **Use in tests via `vitestInvoke`:**
```typescript
const result = await vitestInvoke<any>('test_tp_createPlan', {
    tenant_id: TEST_TENANT,
    name: 'Test Plan',
});
```

3. **After adding new test utilities, rebuild the worker:**
```bash
npm run build
```

The vitest pool uses `dist/worker/wrangler.json`, so the worker must be rebuilt to pick up new exports.

### Key Points
- The `session` object must match what the router's protectedProcedure expects
- Multi-tenant isolation is tested by using different tenant IDs in callers
- The `getDb()` helper creates a Kysely instance with the real D1 database
