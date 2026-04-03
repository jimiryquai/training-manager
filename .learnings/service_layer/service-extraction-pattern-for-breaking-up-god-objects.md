---
module: service_layer
problem_type: best_practice
tags: ["god-object","refactor","extraction","service-layer"]
---
### [2026-04-03] Service Extraction Pattern for Breaking Up God Objects
## Service Extraction Pattern

When extracting a service from a god object file:

### 1. Create the new standalone file first
- Copy types and functions exactly (preserve logic)
- Keep `wrapDatabaseError` wrapper on all database functions
- Maintain multi-tenant filter patterns

### 2. Update the original file
- Add import from new service for any cross-dependencies
- Remove duplicated code (move, not copy)
- Remove unused type imports (e.g., `SessionExerciseTable`)

### 3. Update all consumers
Files that may need import updates:
- tRPC routers (`src/trpc/routers/*.ts`)
- Test utilities (`src/app/test-utils.ts`)
- Seed scripts (`src/scripts/seed.ts`)
- Integration tests (`tests/integration/*.test.ts`)

### 4. Export from index.ts
Add the new service export to `src/services/index.ts`

### Import Pattern for Cross-Service Dependencies
```typescript
// In trainingPlan.service.ts - importing from the new service
import {
  type SessionExerciseRecord,
  createSessionExercise,
  getSessionExercisesBySession,
} from './sessionExercise.service';
```

### Dependency Direction
Establish unidirectional dependencies to avoid cycles:
- `trainingPlan.service.ts` → imports from → `sessionExercise.service.ts`
- Never the reverse
