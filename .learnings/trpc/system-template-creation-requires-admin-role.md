---
module: trpc
problem_type: security
tags: ["authorization","system-templates","admin-role","trpc"]
---
### [2026-04-03] System template creation requires admin role
## System Template Authorization Fix

When implementing `is_system_template: true` in tRPC routers, the must check `ctx.role === 'admin'` before allowing the operation
        - Athletes should get `FORBIDDEN` error
        - Admin users are allowed to proceed

### Implementation Pattern

1. **Extend SessionData and TRPCContext with role:**
```typescript
export interface SessionData {
  userId: string;
  tenantId: string;
  role: UserRole;  // NEW
}

export interface TRPCContext {
  session: SessionData | null;
  tenantId: string | null;
  userId: string | null;
  role: UserRole | null;  // NEW
  db: Kysely<Database>;
}
```

2. **Guard in router (libraryRouter.ts, trainingPlanRouter.ts):**
```typescript
if (input.is_system_template && ctx.role !== 'admin') {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Only admins can create system templates',
  });
}
```

3. **Pass null tenant_id for system templates:**
When creating a system template, the router should pass `null` (or the service layer should handle it):
        tenant_id: input.is_system_template ? null : ctx.tenantId

### Test Utilities Pattern
Create test utilities with explicit role parameter to test authorization:
```typescript
export async function test_tp_createPlanWithRole(input: {
    tenant_id: string;
    name: string;
    is_system_template?: boolean;
    role: UserRole;
}) {
    const caller = createTrainingPlanCaller(input.tenant_id, 'test-user', input.role);
    return await caller.createPlan({
        name: input.name,
        is_system_template: input.is_system_template,
    });
}
```

### Files Modified
- src/trpc/context.ts
- src/trpc/trpc.ts
- src/trpc/handler.ts
- src/trpc/routers/libraryRouter.ts
- src/trpc/routers/trainingPlanRouter.ts
- src/session/UserSession.ts
- src/worker.tsx
- src/app/test-utils.ts
- tests/trpc/routers/libraryRouter.test.ts
- tests/trpc/routers/trainingPlanRouter.test.ts
