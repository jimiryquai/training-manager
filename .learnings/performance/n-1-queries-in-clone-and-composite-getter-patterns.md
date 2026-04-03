---
module: performance
problem_type: best_practice
tags: ["n+1","batch-insert","D1","clone","composite-query"]
---
### [2026-04-03] N+1 queries in clone and composite getter patterns
### [2026-04-03] N+1 Query Pattern in Deep-Clone Operations

**Finding:** `cloneTrainingPlanToTenant` and `getFullTrainingPlan` both iterate over sessions and query exercises per session, creating O(sessions) DB round-trips. The clone function also inserts exercises one-by-one.

**Pattern to avoid:**
```typescript
for (const session of sessions) {
  const exercises = await getSessionExercisesBySession(db, { session_id: session.id });
  for (const exercise of exercises) {
    await createSessionExercise(db, { ... });  // 1 round-trip per exercise
  }
}
```

**Better pattern:**
```typescript
// Single query for all exercises across all sessions
const allExercises = await db.selectFrom('session_exercise')
  .where('session_id', 'in', sessionIds)
  .selectAll().execute();

// Group in-memory
const exercisesBySession = Map.groupBy(allExercises, e => e.session_id);

// Batch insert (max 5 per D1 query limit)
```

**Rule:** When a composite getter or clone walks a parent→child→grandchild hierarchy, fetch all children in one query using `WHERE parent_id IN (...)` and group in-memory.
