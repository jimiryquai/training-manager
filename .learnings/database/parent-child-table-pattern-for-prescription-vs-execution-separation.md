---
module: database
problem_type: best_practice
tags: ["d1","sqlite","migration","parent-child","normalization"]
---
### [2026-04-03] Parent-Child Table Pattern for Prescription vs Execution Separation
### [2026-04-03] Parent-Child Table Pattern: Macro Prescription Junction with Set-Level Actuals

When implementing AI Coach precision tracking, use a two-table hierarchy:

**Parent Table (session_exercise):** Macro-level prescription
- Holds exercise context (circuit_group, order_in_session, scheme_name)
- Stores compliance boundaries (prescribed_rest_min, prescribed_rest_max)
- Contains coach_notes for interval pacing strategies
- Does NOT contain set-level targets (those belong in child)

**Child Table (exercise_set):** Set-by-set precision tracking
- Links via `session_exercise_id` with ON DELETE CASCADE
- Stores both prescription AND execution for each set:
  - Template math: `conversion_factor` (intra-session step-up)
  - Prescription: `prescribed_reps_min/max`, `prescribed_weight`
  - Execution: `actual_reps`, `actual_weight`, `actual_rest_seconds`, `rpe`
- Voice entry tracking via `is_voice_entry` boolean
- Completion status via `is_completed` boolean

**Migration Pattern for Removing Columns (SQLite/D1):**
```sql
-- 1. Create new table without removed columns
CREATE TABLE session_exercise_new (...);

-- 2. Migrate data (exclude removed columns)
INSERT INTO session_exercise_new (...)
SELECT ... FROM session_exercise;

-- 3. Drop and rename
DROP TABLE session_exercise;
ALTER TABLE session_exercise_new RENAME TO session_exercise;

-- 4. Recreate indexes
CREATE INDEX idx_session_exercise_session ON session_exercise(session_id);
```

**Why This Matters:**
- Separates "what was prescribed" (child) from "how to execute the exercise" (parent)
- Enables RAG-based AI Coach to adapt prescriptions per-set based on athlete response
- Auto-regulated rest tracking captures reality vs prescription
- Clean cascade delete ensures data integrity when sessions are removed

