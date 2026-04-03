---
module: trpc
problem_type: best_practice
tags: ["trpc","middleware","tenant_id","multi-tenancy"]
---
### [2026-04-03] tenant_id auto-inject middleware is NOT worth implementing
## Decision: Do NOT auto-inject tenant_id via tRPC middleware

**Context:** 37 occurrences of `tenant_id: ctx.tenantId` across 5 router files.

**Why middleware doesn't help:**
1. The `protectedProcedure` already injects `tenantId` and `userId` into `ctx`.
2. The `tenant_id: ctx.tenantId` pattern occurs at **service call sites** — services are plain functions that don't have access to tRPC context. They MUST receive `tenant_id` as an explicit parameter.
3. A middleware that merges into `input` crashes on procedures with no input schema (previous failed attempt).
4. The only way to avoid `tenant_id: ctx.tenantId` at call sites would be to wrap every service in a class that receives context — that's a massive refactor for zero behavioral benefit.

**Conclusion:** `tenant_id: ctx.tenantId` is already the simplest pattern. Do not add middleware.
