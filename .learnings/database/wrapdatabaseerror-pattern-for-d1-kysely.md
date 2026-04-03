---
module: database
problem_type: best_practice
tags: ["wrapDatabaseError","Kysely","D1","error-handling"]
---
### [2026-04-03] wrapDatabaseError Pattern for D1/Kysely
## wrapDatabaseError - Database Error Wrapper

All database operations should be wrapped with `wrapDatabaseError` to ensure consistent error handling.

### Pattern
```typescript
const result = await wrapDatabaseError(
  () => db.selectFrom('table').execute(),
  'Operation description'
);
```

### Scope (Phase 2)
- 73 functions wrapped across 7 service files
- All Kysely query executions covered

### Why This Matters
- Catches D1-specific errors (variable limits, connection issues)
- Converts to typed `ServiceError` with `DATABASE_ERROR` code
- Provides operation context in error messages
- Enables proper tRPC error propagation

