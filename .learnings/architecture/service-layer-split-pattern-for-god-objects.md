---
module: architecture
problem_type: best_practice
tags: ["god-object","refactor","service-layer","trpc"]
---
### [2026-04-03] Service Layer Split Pattern for God Objects
## Service Layer Split Pattern for God Objects

### Problem
A service file grows beyond 500+ lines by handling multiple related entities (e.g., TrainingPlan + TrainingSession + SessionExercise), becoming a "god object" that violates SRP and creates merge conflict hotspots.

### Solution Pattern

1. **Identify entity boundaries**: Group functions by the primary table/entity they operate on
2. **Establish dependency direction**: Create unidirectional imports (Plan → Session → Exercise)
3. **Cross-entity functions stay with parent**: `cloneTrainingPlan` stays in plan service, imports session/exercise services

### File Structure
```
services/
├── trainingPlan.service.ts      # Plan CRUD + composite (clone, getFull)
├── trainingSession.service.ts   # Session CRUD + composite (getFull)
└── sessionExercise.service.ts   # Exercise CRUD only (leaf entity)
```

### Dependency Rules
- Leaf entities (no children) have no service dependencies
- Parent entities import child services for composite operations
- Never create circular dependencies

### Router Split Consideration
- Can split routers similarly, but consider API ergonomics
- Option A: Mirror service split (3 routers)
- Option B: Combine related entities (2 routers - plan vs session+exercise)
- Option B chosen for TrainingPlan: exercises have no meaning outside sessions

### Breaking Change Mitigation
When router paths change (e.g., `trainingPlan.createSession` → `trainingSession.createSession`):
- Internal tools: Deploy backend + frontend together
- Public APIs: Keep deprecated routes temporarily, add migration guide

