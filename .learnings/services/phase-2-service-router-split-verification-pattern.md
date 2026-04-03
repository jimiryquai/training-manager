---
module: services
problem_type: best_practice
tags: ["service-split","verification","vitest","D1"]
---
### [2026-04-03] Phase 2 Service/Router Split Verification Pattern
When verifying a service/router split (god object refactor), check:
1. **Dependency direction**: Plan → Session → Exercise must be unidirectional (no circular imports). Verify with `grep "^import" *.service.ts`.
2. **Export counts**: Count `export` lines per file to confirm function counts match spec.
3. **Router registration**: Both routers must appear in `appRouter.ts`.
4. **Test bridge**: `test-utils.ts` must use dynamic `import()` from the NEW split files, not the old monolith.
5. **Cross-service functions**: `cloneTrainingPlan`, `getFullTrainingPlan`, `getFullTrainingSession` must work correctly across all 3 service boundaries.
6. **Pre-existing failures**: Distinguish failures caused by the refactor vs pre-existing issues (e.g., `onConflict` D1 limitation in `upsertDailyWellness`).

Key fidelity: All training tests use `vitestInvoke` with real D1 database via `/_test` route — zero mocks.
