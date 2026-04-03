---
module: testing
problem_type: best_practice
tags: ["refactor","test-structure","vitest","integration-tests"]
---
### [2026-04-03] Combined Test Files Can Remain As-Is After Service Splits
### [2026-04-03] Phase 2: Combined Test Files Valid After Service Split
## Combined Test Files Can Remain As-Is After Service Splits

### Key Insight
When splitting a god object service into multiple services, the existing combined integration test file does NOT need to be split to match. Tests verify **behavior**, not file structure.

### What Happened
- `trainingPlan.service.ts` was split into 3 services
- `trainingPlan.router.ts` was split into 2 routers
- The combined test file `tests/integration/training-plan.test.ts` remained as a single file
- All tests passed because `vitestInvoke` calls go through the `/_test` route, which exercises the full request → router → service → DB pipeline regardless of internal file organization

### When To Split Tests
- Split tests when: a new entity gets its own independent feature surface
- Don't split tests when: the original feature boundary remains cohesive (e.g., "training plan management" covers plan + sessions + exercises as one user workflow)

### Pre-existing Test Failures
During Phase 2 verification, some `wellnessRouter` tests failed due to D1 `onConflict` compatibility issues. These were **pre-existing and unrelated** to the training plan refactor. Always distinguish:
1. Run the failing tests on the pre-refactor branch to confirm
2. If they fail there too → pre-existing, file separately
3. If they pass there → regression from the refactor
