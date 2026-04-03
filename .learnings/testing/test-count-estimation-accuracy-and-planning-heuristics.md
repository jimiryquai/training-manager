---
module: testing
problem_type: best_practice
tags: ["estimation","test-planning","phase-3","accuracy","skipped-tests"]
---
### [2026-04-03] Test Count Estimation Accuracy and Planning Heuristics
## Test Estimation Accuracy and Planning Notes

### Phase 3 Estimate vs Actual
- **Estimated**: ~124 tests
- **Actual**: ~134 tests across 6 files
- **Variance**: +8% over estimate

### Why Tests Exceed Estimates
1. **Edge cases discovered during writing**: Zero-value edge cases (0 duration, 0 RHR), boundary tests (min/max sRPE), and error conditions
2. **Multi-tenant isolation**: Every procedure needs at least one cross-tenant test, which adds 1-2 tests per describe block
3. **Upsert behavior**: Wellness router's upsert semantics required separate create-then-update tests
4. **Procedure coverage expansion**: LibraryRouter went from 3/11 to 11/11, and some procedures needed multiple test cases

### Test Count Planning Rule of Thumb
For router tests with N procedures, estimate:
- 1-2 happy path tests per procedure
- 1 edge case test per procedure (boundary values)
- 1 multi-tenant isolation test per describe block
- Total ≈ N × 1.7 (rounded up)

Example: 11 procedures × 1.7 = ~19 tests (actual: 19 for libraryRouter)

### Skipped Tests Status
- `coachAgent.websocket.test.ts`: 16 tests in `describe.skipIf(!shouldRun)` block
- These require a running dev server — expected to be skipped in CI
- NOT counted in the 134 new tests or the 371 total
