---
module: database
problem_type: best_practice
tags: ["d1","sqlite","migration","enum","kysely"]
---
### [2026-03-22] SQLite D1 Migration: Removing CHECK Constraints from Enum Columns
### [2026-03-22] Removing CHECK Constraints from SQLite D1 Columns

When migrating a SQLite column with a CHECK constraint (enum) to a flexible string field, use this pattern:

**Migration Strategy:**
```sql
-- 1. Create new table without the CHECK constraint
CREATE TABLE table_name_new (
  id TEXT PRIMARY KEY,
  -- ... other columns
  column_name TEXT NOT NULL,  -- Removed CHECK constraint
  -- ... rest of schema
);

-- 2. Migrate data to new table
INSERT INTO table_name_new (id, ..., column_name, ...)
SELECT id, ..., column_name, ...
FROM table_name;

-- 3. Drop old table and rename
DROP TABLE table_name;
ALTER TABLE table_name_new RENAME TO table_name;

-- 4. Recreate indexes
CREATE INDEX idx_name ON table_name(column_name);
```

**Kysely Schema Updates:**
- Remove the TypeScript enum type definition
- Update the table interface to use `string` instead of the enum type
- Add a comment documenting the legacy values for reference

**Why This Pattern:**
- SQLite doesn't support `ALTER COLUMN` to remove constraints
- Recreating the table preserves data while changing the schema
- Indexes must be recreated after the table rename
- All foreign key relationships are preserved

**Example Context:**
Removing strict enum constraints from `movement_category` to allow hybrid training modalities like "hybrid_cardio_strength".
