---
module: architecture
problem_type: security
tags: ["system-template","authorization","multi-tenancy","escalation"]
---
### [2026-04-03] System template creation lacks role-based authorization check
### [2026-04-03] System Template Authorization Gap

**Finding:** `libraryRouter.addExercise` accepts `is_system_template: boolean` from any authenticated user. When true, it sets `tenant_id = null`, creating a global exercise visible to all tenants. There is no role check.

Similarly, `cloneTrainingPlanToTenant` reads source plans without a `tenant_id` filter, enabling cross-tenant data access if a plan UUID is known.

**Fix needed:**
1. Propagate `role` through tRPC context
2. Guard `is_system_template` behind admin role check
3. Add `tenant_id` filter to clone source plan lookup (with explicit system template path)
4. Consider auditing all service functions that accept `tenant_id: null` for authorization gaps
