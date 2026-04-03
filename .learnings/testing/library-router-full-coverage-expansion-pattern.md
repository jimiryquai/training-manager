---
module: testing
problem_type: best_practice
tags: ["library-router","procedure-coverage","createCaller","test-utils","multi-tenant"]
---
### [2026-04-03] Library Router Full Coverage Expansion Pattern
## Library Router: 3/11 → 11/11 Procedure Coverage Expansion

### Context
Phase 3 expanded libraryRouter tests from 3 to 19 tests, covering all 11 router procedures.

### The 11 Library Router Procedures (All Now Tested)
1. `addExercise` — creates exercise with name, category, type
2. `getExercises` — fetches by movement_category for tenant
3. `updateExercise` — updates name, benchmark_target, conversion_factor
4. `deleteExercise` — soft or hard delete, returns boolean
5. `getSystemExercises` — returns exercises where tenant_id IS NULL
6. `getExercisesByBenchmarkTarget` — finds exercises with specific benchmark_target
7. `saveBenchmark` — upserts user benchmark (1RM, etc.)
8. `getUserBenchmark` — gets single benchmark by exercise name
9. `getUserBenchmarks` — gets all benchmarks for a user
10. `getTrainingMaxForExercise` — calculates training max = benchmark * conversion_factor
11. `getExercisesByBenchmark` — fetches exercises matching a benchmark name

### Test Utility Pattern for Library Router
Library router test utils use `createCaller` internally in test-utils.ts:
```typescript
function createLibraryCaller(tenantId: string, userId: string = 'test-user') {
    return libraryRouter.createCaller({
        session: { userId, tenantId },
        tenantId,
        userId,
        db: getDb(),
    });
}
```
Each `test_library_*` function creates a caller and invokes the procedure. The `userId` must match across all library utilities (default: `'test-user'`).

### Critical Pattern: Multi-Tenant in Library Tests
- Exercise data belongs to a tenant; system exercises have `tenant_id = NULL`
- Cross-tenant tests verify: tenant B cannot see/update/delete tenant A's exercises
- System exercises (null tenant_id) are visible to all tenants but cannot be modified by tenants
- Benchmarks are per-user-per-tenant — cross-tenant isolation applies

### Adding New Procedures
When adding a new procedure to libraryRouter:
1. Add `test_library_<name>` to `src/app/test-utils.ts`
2. Rebuild worker: `npm run build` (vitest reads from `dist/`)
3. Add test(s) covering: happy path, edge cases, multi-tenant isolation
4. Run `npx vitest run tests/trpc/routers/libraryRouter.test.ts` to verify
