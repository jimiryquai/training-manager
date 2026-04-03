---
module: testing
problem_type: best_practice
tags: ["wellness-router","mock-rewrite","integration-tests","createCaller","real-D1"]
---
### [2026-04-03] Wellness Router Mock-to-Real-D1 Rewrite Pattern
## Wellness Router Rewrite: Mock-to-Real-D1 Migration Pattern

### Context
Phase 3 rewrote `tests/trpc/routers/wellnessRouter.test.ts` from a mock-based approach to real D1 integration tests following the libraryRouter pattern.

### Old Pattern (Mocks — DO NOT USE)
```typescript
// Bad: Mocked db and session
const mockDb = { /* hand-rolled query mocks */ };
const mockSession = { userId: 'test', tenantId: 'test' };
const caller = wellnessRouter.createCaller({ db: mockDb, session: mockSession });
```
Problems:
- Tests pass even when real DB constraints would fail
- Mock drift from actual service signatures
- No coverage of actual SQL/Kysely query behavior
- Cannot catch D1-specific issues (CHECK constraints, variable limits)

### New Pattern (Real D1 — USE THIS)
```typescript
// Good: Real D1 via vitestInvoke
const result = await vitestInvoke('test_w_logDailyMetrics', {
    tenant_id: TEST_TENANT,
    date: '2026-04-03',
    rhr: 55,
    hrv_rmssd: 45,
});
```

### Migration Steps for Any Router
1. **Identify mock boundaries**: Find all places where `mockDb`, `mockSession`, or `vi.fn()` are used
2. **Add test utilities in test-utils.ts**: Create `test_<prefix>_<procedure>` functions that use `createCaller` with real `getDb()`
3. **Replace test assertions**: Change from "was the mock called?" to "did the real operation succeed?"
4. **Add FK setup**: Create prerequisite entities in `beforeEach` (users, plans, etc.)
5. **Add multi-tenant verification**: Every procedure should have at least one cross-tenant test

### Wellness-Specific Notes
- Wellness router uses upsert behavior (`logDailyMetrics` updates if same date exists)
- Wellness scores are 1-5 (NOT 1-10) — SQLite CHECK constraint enforced
- `test_cleanDatabase` must be called for both TENANT_A and TENANT_B in beforeEach
- User creation is required in beforeEach due to FK constraint on wellness records
