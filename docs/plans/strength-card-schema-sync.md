# Blueprint: Strength Card Schema Synchronization

This blueprint outlines the synchronization of the database schema with `strength-card-data.json` and existing migrations.

## Current Discrepancies
- **Desync:** `src/db/schema.ts` is missing fields from migrations 0007 and 0008.
- **Missing Field:** `body_weight` is present in the data but not in the `daily_wellness` table.

## Required Database Changes

### Migration 0009: Add Bodyweight Tracking
- **Table:** `daily_wellness`
- **Action:** `ALTER TABLE daily_wellness ADD COLUMN body_weight REAL;`

### Migration 0007/0008 Synchronization
- Ensure `user` table includes `display_name` and `group_name`.
- Ensure `exercise_dictionary` table includes `percent_bodyweight_used`, `equipment_type`, `rounding_increment`, and `notes`.
- Ensure `set_rep_scheme`, `set_rep_set`, and `set_rep_progression` tables exist.

## Implementation Steps (for Backend Engineer)
1. **Migrations:** Create and apply D1 migration `0009_add_body_weight`.
2. **Schema Update:** Update `src/db/schema.ts` to include all missing interfaces and the `body_weight` field in `DailyWellnessTable`.
3. **Kysely Sync:** Ensure the `Database` interface includes the new tables and fields for strict type safety.

## Verification Checklist (for Tester)
- [ ] Migration 0009 applied successfully.
- [ ] `src/db/schema.ts` matches the database structure.
- [ ] Wellness integration tests pass with `body_weight` input.
- [ ] User benchmarks correctly store strength data (Squat, Bench, etc.).
