---
module: architecture
problem_type: gotcha
tags: ["god-object","refactor","bottom-up","dependency-order"]
---
### [2026-04-03] Bottom-Up Extraction Order for Service Splits
### [2026-04-03] Phase 2: Bottom-Up Extraction Order
## Bottom-Up Extraction Order for Service Splits

### Key Insight
When splitting a god object service, extraction order matters. Always go **bottom-up**: extract the leaf dependency first, then the middle, then refactor the top.

### Order for TrainingPlan God Object (663 lines → 3 services)
1. **Exercise (leaf)** — `sessionExercise.service.ts` — 6 functions, no child dependencies
2. **Session (middle)** — `trainingSession.service.ts` — 7 functions, depends only on exercise
3. **Plan (top/parent)** — `trainingPlan.service.ts` — 8 functions, imports from both children

### Why This Order
- Each extracted service can be tested independently immediately
- The top-level service is always last because it may import from the others
- Reversing the order would require stub imports or partial implementations

### Router Split: Parallel After Sequential
- Service extraction MUST be sequential (dependency order)
- Router extraction can be done in PARALLEL after all services are stable
- For TrainingPlan: 352-line router → 2 routers (8 + 13 procedures)
  - `trainingPlan.router.ts` (8 procedures for plan CRUD + composites)
  - `trainingSession.router.ts` (13 procedures for session + exercise operations)

### Actual Results
| Metric | Before | After |
|--------|--------|-------|
| Service lines | 663 (1 file) | ~280 (3 files: 8+7+6 functions) |
| Router lines | 352 (1 file) | ~360 (2 files: 8+13 procedures) |
| Dependency direction | flat | unidirectional: Plan → Session → Exercise |
