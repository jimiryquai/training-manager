---
module: security
problem_type: security
tags: ["cross-tenant","clone","authorization","role-based-access"]
---
### [2026-04-03] Phase 6 critical security findings: cross-tenant clone and missing RBAC
### [2026-04-03] Phase 6 Critical Security Findings

## Finding 1: Cross-Tenant Clone via Missing tenant_id Filter
`cloneTrainingPlanToTenant` in `src/services/trainingPlan.service.ts` reads the source plan with `getTrainingPlanById(db, { id: input.plan_id })` — no tenant_id filter. Any authenticated user can clone any plan across tenants by UUID.

**Fix:** Source plan lookup must enforce: `(tenant_id IS NULL AND is_system_template = 1) OR (tenant_id = caller_tenant_id)`

## Finding 2: Missing RBAC on System Template Creation
Both `libraryRouter.addExercise` and `trainingPlanRouter.createPlan` accept `is_system_template: true` from any authenticated user with zero role checks. The `TRPCContext` does not propagate `role`.

**Fix:** 
1. Add `role: UserRole` to `SessionData` and `TRPCContext`
2. Update session store to load role from `users` table
3. Guard `is_system_template` behind `ctx.role === 'admin'` check

## Finding 3: Hardcoded CORS Wildcard
`src/trpc/handler.ts` uses `Access-Control-Allow-Origin: *`. Make configurable via `CreateHandlerOptions.allowedOrigin`.

## Architecture Decision
Role propagation through tRPC context is the correct pattern — it's a single source of truth and avoids per-router auth checks diverging. The `protectedProcedure` middleware should propagate `role` alongside `tenantId` and `userId`.
