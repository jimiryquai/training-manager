---
module: service_layer
problem_type: best_practice
tags: ["kysely","exercise-dictionary","defaults","type-safety"]
---
### [2026-04-08] Kysely required fields with DB defaults need explicit values in service layer
When a Kysely `ExerciseDictionaryTable` has fields like `percent_bodyweight_used: number` and `rounding_increment: number` that have SQL DEFAULT constraints but are NOT wrapped in `Generated<>`, they are required in the TypeScript insert type. The service layer must provide defaults explicitly via `?? 0` and `?? 2.5` in the `.values()` call. Pattern:\n\n```typescript\npercent_bodyweight_used: input.percent_bodyweight_used ?? 0,\nrounding_increment: input.rounding_increment ?? 2.5,\n```\n\nThe `CreateExerciseInput` interface should mark these as optional (`?:`) so callers don't need to provide them, while the `ExerciseDictionaryRecord` return type should mark them as required since the DB always returns them.\n\nRule of thumb: If a field has a DB DEFAULT but no `Generated<>` wrapper in the Kysely interface, the service must supply the default value at insert time.
