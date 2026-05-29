---
module: security
problem_type: best_practice
tags: ["code-review","checklist","phase-6","security-review"]
---
### [2026-04-03] Phase 6 branch review pattern - security, performance, and testing validation
## Phase 6 Branch Review Checklist Pattern

When reviewing security-focused branches, validate these key areas:

### Security Validation
1. **Cross-tenant access** - Ensure all queries filter by `tenant_id` unless accessing system templates (`tenant_id IS NULL AND is_system_template = 1`)
2. **RBAC propagation** - Role must flow: `SessionData.role` → `TRPCContext.role` → `protectedProcedure` middleware → router guards
3. **CORS configuration** - Should be configurable via env var, not hardcoded to `*`

### Performance Validation
1. **N+1 queries** - Composite getters should use `WHERE parent_id IN (...)` and `Map.groupBy`
2. **Batch inserts** - D1 has SQL variable limits; batch at 5 records max per insert
3. **Null handling in Kysely** - Use `=== null ? 'is' : '='` for correct SQL generation

### Testing Validation
1. **No mocks for DB/router** - Follow AGENTS.md anti-mock rule
2. **Multi-tenant isolation tests** - Verify cross-tenant access returns empty/undefined
3. **Security test utilities** - Create `*WithRole` helpers for RBAC testing

### Code Hygiene
1. **Duplicate imports** - Check for same symbol imported multiple times
2. **Import placement** - All imports at top of file
3. **Dead code removal** - Remove tests that provide false confidence
