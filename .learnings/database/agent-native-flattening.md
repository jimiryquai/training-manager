---
module: database
problem_type: architectural_decision
tags: ["schema","flattening","agent-native","performance","ai-coach"]
---
### [2026-03-22] Architectural Decision: Agent-Native Schema Flattening

We have explicitly chosen a **flattened schema** for training plans and sessions over a normalized relational structure.

**Decision:**
Map all periodization and set/rep schemes directly into the `TrainingPlan` -> `TrainingSession` -> `SessionExercise` hierarchy.

**Rationale:**
1. **Query Speed (Cloudflare D1):** Minimizes SQL JOINs at the edge. A single query can retrieve the entire session structure.
2. **AI Reasoning Simplicity:** Agents (like the CoachAgent) can read and modify a single `SessionExercise` record to adjust a workout in real-time without managing multi-table transactions for "Set Schemes".
3. **Cloning Efficiency:** In our Hybrid Multi-Tenant model, cloning a system template into a user sandbox becomes a shallow copy of the hierarchy rather than an expensive recursive walk of many tables.
4. **Data Portability:** Training plans can be exported/imported as simple JSON blobs that map 1:1 to the table structure.

**Implementation Details:**
- `DailyWellnessTable` contains `body_weight` for ACWR/relative strength calculations.
- `SessionExerciseTable` contains `target_sets`, `target_reps` (TEXT), `target_intensity`, `target_rpe`, `target_tempo`, and `target_rest_seconds`.
- Removed proposed `set_rep_scheme`, `set_rep_set`, and `set_rep_progression` tables.

**When to Revist:**
Only if the variety of "Target" metrics grows so large that it exceeds SQLite's column limits or if we need complex multi-session periodization logic that cannot be expressed in a flat structure.
