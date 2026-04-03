---
module:  orchestration
problem_type: coordination_error
tags: ["spawn_team","dependencies","sequential-vs-parallel","tester"]
---
### [2026-04-03] Test agents must run AFTER implementation agents, not parallel
## Problem
When dispatching `spawn_team` with both a backend-engineer and tester, the tester was writing tests (e.g. `errors.test.ts`) against code (`ServiceError` class in `src/services/errors.ts`) that the backend engineer hadn't created yet. This caused the tester to create its own copy of the dependency file in its worktree, leading to divergent implementations.

## Root Cause
TDM treated all implementation units as parallelizable, but there was a hard dependency: tests import code that the backend engineer was writing simultaneously.

## Correct Pattern
1. **Sequential by default**: Run backend implementation first, THEN dispatch tester against completed code.
2. **Conditional parallelism**: Only run tester in parallel if tests ONLY cover pre-existing code (e.g., testing tenant isolation on already-existing service functions).
3. **Explicit dependency check**: Before dispatching tester, verify that every import in the test plan exists in the codebase.

## Rule of Thumb
> If the plan says "Create X" and "Test X", those are NEVER parallelizable. Test runs after create.
