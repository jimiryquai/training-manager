---
module: testing
problem_type: best_practice
tags: ["test-coverage","test-bridge","vitestInvoke","router-testing"]
---
### [2026-04-03] Router Integration Testing Pattern with createCaller
## Router Integration Testing Pattern

When testing tRPC routers with real D1, use the **`createCaller` pattern** in `src/app/test-utils.ts`:

```typescript
export async function test_tp_createPlan(input: { tenant_id: string; name: string }) {
  const db = getDb();
  const caller = trainingPlanRouter.createCaller({
    session: { userId: 'test-user', tenantId: input.tenant_id },
    tenantId: input.tenant_id,
    userId: 'test-user',
    db,
  });
  return await caller.createPlan({ name: input.name });
}
```

Then in test files, use `vitestInvoke('test_tp_createPlan', { ... })`.

This pattern:
1. Exercises the full router → service → DB pipeline
2. Validates Zod input schemas
3. Tests `protectedProcedure` context extraction
4. Uses real D1 (no mocks)

### When to Use vs Direct Service Tests
- **Router tests**: When you need to validate Zod schemas, context injection, or procedure-level behavior
- **Service tests**: When you need to test business logic in isolation without tRPC overhead

Both use `vitestInvoke` with real D1.

