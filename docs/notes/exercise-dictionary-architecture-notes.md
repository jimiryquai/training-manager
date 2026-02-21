# Exercise Dictionary - Architecture Notes

**Date:** 2026-02-21
**Branch:** `feature/exercise-dictionary`
**Status:** Implementation complete, pending review

---

## What Was Built

- `exercise_dictionary` table with self-referencing FK for master/child relationships
- `user_benchmarks` table with FK to exercise_dictionary
- `libraryRouter` tRPC API with 4 procedures
- 7 integration tests (all passing)

---

## Resolved Issues

| Issue | Resolution |
|-------|------------|
| String-based benchmark coupling | Fixed: Changed `master_exercise_name` → `master_exercise_id` with proper FK + CASCADE |

---

## Open Questions / Risks

### 1. Master/Child Depth
**Current:** Service only resolves one level of master relationship.
**Question:** Do we need recursive resolution? E.g., if Air Squat → Goblet Squat → Back Squat, should querying Air Squat return the full chain?
**Impact:** UI design for exercise selection

### 2. Conversion Factor Semantics
**Current:** `conversion_factor` on child exercises (e.g., Goblet Squat = 0.7 × Back Squat)
**Question:** Is this the right direction? Could also be "difficulty multiplier" where higher = harder.
**Impact:** How UI displays estimated maxes

### 3. No Validation on Masters
**Current:** Nothing prevents a master exercise from having a `conversion_factor`.
**Suggestion:** Add application-level validation or computed column to flag "is_master".
**Impact:** Data integrity

### 4. MovementCategory Values
**Current:** `'squat' | 'hinge' | 'push' | 'pull' | 'carry' | 'core' | 'cardio'`
**Question:** Is this the canonical list? Should it be configurable per-tenant?
**Impact:** Exercise categorization in UI

### 5. Progression Level Meaning
**Current:** `progression_level INTEGER NOT NULL` with no constraints
**Question:** What's the scale? 1-5? 1-10? What does each level mean?
**Impact:** How UI orders/suggests exercises

---

## Next Steps

1. Review above questions
2. Build UI for exercise dictionary management
3. Add seed data for common exercises
4. Consider: Should we pre-populate a "global" exercise dictionary that tenants can extend?

---

## Files Changed

```
src/db/migrations/0003_exercise_dictionary.sql
src/db/schema.ts
src/services/exerciseDictionary.service.ts
src/services/index.ts
src/trpc/routers/libraryRouter.ts
src/trpc/routers/index.ts
tests/trpc/routers/libraryRouter.test.ts
```
