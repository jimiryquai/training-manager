# Hybrid Multi-Tenant Pattern with Nullable Tenant ID

## Context
When building SaaS applications that require both global system templates (available to all users) and private tenant data, a common architectural pattern is the "Hybrid Multi-Tenant" approach.

In this pattern, the same table stores both global and local records, distinguished by a `tenant_id` field.

## The Problem
Original schema designs often enforce `NOT NULL` on `tenant_id` to ensure data isolation. However, this creates a "Magic String" requirement (e.g., using `'SYSTEM'` or `'GLOBAL'`) to represent system-wide templates. These magic strings introduce risk of accidental collisions and complicate Kysely type safety.

## The Solution (TO-BE)
1. **Nullable `tenant_id`**: Allow `tenant_id` to be `NULL` across all hierarchy tables (Training Plan -> Session -> Exercise).
2. **Global = NULL**: Explicitly use `NULL` to represent system templates. This is the "Zero Magic String" approach.
3. **Kysely Queries**: Use `.where('tenant_id', 'is', null)` for templates and `.where(eb => eb.or([eb('tenant_id', 'is', null), eb('tenant_id', '=', context_tenant)]))` for tenant-aware reads.

## Implementation Details
- **Migration**: Ensure all FK-related tables are also nullable to allow consistent system templates.
- **Service Layer**: Method signatures should accept `string | null` for `tenant_id` and handle isolation logic surgically.
- **Cloning**: When cloning from a system template (`NULL`) to a tenant, ensure a deep copy is performed where children are re-assigned to the target `tenant_id`.

## Prevention & Best Practices
- Avoid enforcing `NOT NULL` on `tenant_id` if the table is intended to have a global context.
- Always use `null` instead of magic strings to simplify validation and type checking.
- Ensure integration tests verify that tenant updates do not affect system templates.
