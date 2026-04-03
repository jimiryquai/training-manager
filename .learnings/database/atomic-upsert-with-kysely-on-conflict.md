---
module: database
problem_type: pattern
tags: ["upsert","ON CONFLICT","Kysely","race-condition","TOCTOU"]
---
### [2026-04-03] Atomic Upsert with Kysely ON CONFLICT
## Atomic Upsert Pattern - Eliminates TOCTOU Race Conditions

Use Kysely's `onConflictDoUpdate` for atomic upserts instead of check-then-insert patterns.

### Anti-Pattern (TOCTOU vulnerable)
```typescript
const existing = await db.selectFrom('table').where('id', id).executeTakeFirst();
if (existing) {
  await db.updateTable('table').set(data).where('id', id).execute();
} else {
  await db.insertInto('table').values(data).execute();
}
```

### Correct Pattern (Atomic)
```typescript
await db.insertInto('dailyWellness')
  .values({ athleteId, date, ...data })
  .onConflict((oc) => oc
    .columns(['athleteId', 'date'])
    .doUpdateSet({ ...data })
  )
  .execute();
```

### Key Points
- Use unique constraint columns in `onConflictDoUpdate`
- Eliminates race condition between check and insert
- Single round-trip to database
- Applied in `dailyWellness.service.ts` for athlete/date unique constraint

