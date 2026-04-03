---
module: testing
problem_type: best_practice
tags: ["test-review","coverage-gaps","anti-mock","trainingRouter"]
---
### [2026-04-03] Phase 1-5 Test Review — Critical Gaps Found
## Phase 1-5 Test Suite Review Results

### Test Run: 355 pass, 16 skipped (WebSocket dev-server), 8.49s

### Critical Findings
1. **trainingRouter has ZERO test coverage** — 7 procedures (logSession, updateSession, getSession, getSessionsByDateRange, getACWRStatus, logSessionViaAgent, markAsVoiceEntry) are live in appRouter but untested. File: `src/trpc/routers/trainingRouter.ts`

2. **dashboardRouter.test.ts violates Anti-Mock Rule** — Uses vi.fn() chained mocks for db. Every other router test uses real D1. Only 2 tests. File: `tests/fate/dashboardRouter.test.ts`

3. **CoachAgent "AI Error Handling" tests are false-confidence** — They define inline constants and assert those constants equal themselves. They test nothing. File: `tests/agent/CoachAgent.test.ts` lines ~900-920

### Minor Findings
- sessionExercise.service.ts has no dedicated test file (only tested indirectly)
- Multi-tenant isolation in CoachAgent benchmark tests doesn't verify cross-tenant query returns nothing
- Minor toBeTruthy() false-confidence in CoachAgent tool definition test

### Recommended Priority
1. Write tests/trpc/routers/trainingRouter.test.ts (7 untested procedures)
2. Rewrite tests/fate/dashboardRouter.test.ts from mocks to real D1
3. Remove or replace false-confidence AI error handling tests
