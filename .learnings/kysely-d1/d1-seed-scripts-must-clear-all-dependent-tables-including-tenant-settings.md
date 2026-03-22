---
module: kysely-d1
problem_type: best_practice
tags: ["seed","batch-insert","D1","constraints"]
---
### [2026-03-22] D1 seed scripts must clear all dependent tables including tenant_settings
When implementing seed scripts for Kysely/D1 databases that use a fixed tenant_id (e.g., 'seed-tenant-001'), ensure that ALL tables with unique constraints on tenant_id are cleared before insertion.

**Issue:**
Running the same seed script twice fails with `UNIQUE constraint failed: tenant_settings.tenant_id: SQLITE_CONSTRAINT` because the clearing phase didn't include tenant_settings deletion.

**Solution:**
Add deletion for tenant_settings (and any other tables with unique tenant_id constraints) in the clearing phase of seed scripts:

```typescript
// Clear tenant settings for this seed tenant
await db.deleteFrom('tenant_settings')
  .where('tenant_id', '=', TENANT_ID)
  .execute();
```

**Key Points:**
1. Always clear ALL tables that have unique constraints on the seed tenant_id
2. Delete in reverse dependency order (child tables before parent tables)
3. Use consistent tenant_id values across seed runs for idempotency

This allows the seed script to be re-run without constraint violations.
