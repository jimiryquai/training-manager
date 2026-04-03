---
module: service_layer
problem_type: best_practice
tags: ["multi-tenancy","kysely","sql","security"]
---
### [2026-04-03] Multi-Tenancy Filter Patterns in Service Layer
## Multi-Tenancy Filter Patterns in Service Layer

### Problem
Without tenant isolation in queries, users could access data from other tenants.

### Solution Patterns

#### 1. Nullable `tenant_id` Column
System templates use `tenant_id = NULL` for global access. Tenant-specific data uses the tenant's ID.

#### 2. Conditional Filter Pattern
Use the `is` operator for nullable tenant_id matching:

```typescript
export interface GetTrainingPlanInput {
  id: string;
  tenant_id?: string | null;  // Optional for internal/system calls
}

export async function getTrainingPlanById(db: Kysely<Database>, input: GetTrainingPlanInput) {
  let query = db
    .selectFrom('training_plan')
    .where('id', '=', input.id);

  // Key: Use 'is' operator for nullable comparisons
  // Works correctly for both NULL and string values
  if (input.tenant_id !== undefined) {
    query = query.where('tenant_id', 'is', input.tenant_id);
  }

  return query.selectAll().executeTakeFirst();
}
```

#### 3. Include System Templates Pattern
For read operations that should include global system templates:

```typescript
export async function getTrainingPlansForTenant(db: Kysely<Database>, tenant_id: string) {
  return db
    .selectFrom('training_plan')
    .where(eb => eb.or([
      eb('tenant_id', 'is', null),      // Global system templates
      eb('tenant_id', '=', tenant_id)   // Tenant-specific plans
    ]))
    .selectAll()
    .execute();
}
```

#### 4. Strict Tenant Enforcement Pattern
For write/update/delete operations, always require exact tenant match:

```typescript
export async function updateTrainingPlan(db: Kysely<Database>, input: UpdateTrainingPlanInput) {
  return db
    .updateTable('training_plan')
    .set(updates)
    .where('id', '=', input.id)
    .where('tenant_id', 'is', input.tenant_id)  // Must match exactly
    .returningAll()
    .executeTakeFirst();
}
```

### Key Decision Points
- **Read queries**: Consider whether system templates should be included
- **Write queries**: Always enforce exact tenant match
- **Internal service calls**: Pass `tenant_id` explicitly - no implicit context

### Gotcha: The `is` Operator
In Kysely/D1, use `.where('tenant_id', 'is', value)` NOT `.where('tenant_id', '=', value)` when the column is nullable. The `=` operator does not match NULL values in SQL.
