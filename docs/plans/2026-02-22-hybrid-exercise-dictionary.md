# Hybrid Exercise Dictionary & Benchmarks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the exercise dictionary to support both weighted (barbell) and isometric (bodyweight/gymnastics) exercises with unit-agnostic benchmarks.

**Architecture:** Replace the self-referencing FK pattern with abstract text-based `benchmark_target` linking. Rename `one_rep_max_weight` to generic `benchmark_value` + `benchmark_unit` columns. Add `exercise_type` to distinguish dynamic/isometric/eccentric movements.

**Tech Stack:** Cloudflare D1 (SQLite), Kysely, tRPC, Vitest

---

## Background

The current schema only supports weighted exercises with `one_rep_max_weight`. Bodyweight isometrics (Planche, Front Lever) use time (seconds) as their benchmark, not weight. We need a unit-agnostic system that handles both.

**Key changes:**
1. `exercise_dictionary.master_exercise_id` → `benchmark_target` (TEXT, e.g., "Planche", "Squat")
2. `user_benchmarks.one_rep_max_weight` → `benchmark_value` (REAL) + `benchmark_unit` (TEXT: 'kg', 'lbs', 'seconds')
3. Add `exercise_type` column: 'dynamic', 'isometric', or 'eccentric'

---

## Task 1: Create Database Migration

**Files:**
- Create: `src/db/migrations/0004_hybrid_benchmarks.sql`

**Step 1: Write migration to add new columns and migrate data**

```sql
-- Add exercise_type column to exercise_dictionary
ALTER TABLE exercise_dictionary ADD COLUMN exercise_type TEXT NOT NULL DEFAULT 'dynamic'
  CHECK (exercise_type IN ('dynamic', 'isometric', 'eccentric'));

-- Add benchmark_target column (will replace master_exercise_id)
ALTER TABLE exercise_dictionary ADD COLUMN benchmark_target TEXT;

-- Add benchmark_value and benchmark_unit to user_benchmarks
ALTER TABLE user_benchmarks ADD COLUMN benchmark_value REAL;
ALTER TABLE user_benchmarks ADD COLUMN benchmark_unit TEXT;

-- Migrate existing data: copy one_rep_max_weight to benchmark_value
UPDATE user_benchmarks SET 
  benchmark_value = one_rep_max_weight,
  benchmark_unit = 'kg'
WHERE benchmark_value IS NULL;

-- Migrate master_exercise_id to benchmark_target by looking up exercise names
-- (For existing data, we'll copy the master exercise name as benchmark_target)
UPDATE exercise_dictionary 
SET benchmark_target = (
  SELECT ed2.name 
  FROM exercise_dictionary ed2 
  WHERE ed2.id = exercise_dictionary.master_exercise_id
)
WHERE master_exercise_id IS NOT NULL;

-- Create index on new columns
CREATE INDEX idx_exercise_dictionary_benchmark_target ON exercise_dictionary(benchmark_target);
CREATE INDEX idx_user_benchmarks_benchmark_unit ON user_benchmarks(benchmark_unit);
```

**Step 2: Verify migration runs successfully**

Run: `npm run generate`
Expected: Types regenerate with new columns

---

## Task 2: Update Kysely Schema Types

**Files:**
- Modify: `src/db/schema.ts:45-65`

**Step 1: Add ExerciseType type and update tables**

```typescript
// Add new type at top of file (after MovementCategory)
export type ExerciseType = 'dynamic' | 'isometric' | 'eccentric';

// Update ExerciseDictionaryTable (lines 45-55)
export interface ExerciseDictionaryTable {
  id: Generated<string>;
  tenant_id: string;
  name: string;
  movement_category: MovementCategory;
  progression_level: number;
  exercise_type: ExerciseType;
  benchmark_target: string | null;
  conversion_factor: number | null;
  master_exercise_id: string | null;  // Keep for backward compatibility during migration
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

// Update UserBenchmarksTable (lines 57-65)
export interface UserBenchmarksTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  benchmark_name: string;
  benchmark_value: number | null;
  benchmark_unit: string | null;
  master_exercise_id: string | null;  // Keep for backward compatibility
  one_rep_max_weight: number | null;  // Keep for backward compatibility
  created_at: Generated<string>;
  updated_at: Generated<string>;
}
```

**Step 2: Run type generation**

Run: `npm run generate`
Expected: No errors

---

## Task 3: Update Service Layer

**Files:**
- Modify: `src/services/exerciseDictionary.service.ts`

**Step 1: Update CreateExerciseInput interface**

```typescript
export type ExerciseType = 'dynamic' | 'isometric' | 'eccentric';
export type BenchmarkUnit = 'kg' | 'lbs' | 'seconds';

export interface CreateExerciseInput {
  tenant_id: string;
  name: string;
  movement_category: MovementCategory;
  progression_level: number;
  exercise_type: ExerciseType;
  benchmark_target?: string | null;
  conversion_factor?: number | null;
}

export interface ExerciseDictionaryRecord {
  id: string;
  tenant_id: string;
  name: string;
  movement_category: MovementCategory;
  progression_level: number;
  exercise_type: ExerciseType;
  benchmark_target: string | null;
  conversion_factor: number | null;
}
```

**Step 2: Update createExercise function**

Update the values being inserted:
```typescript
.values({
  id,
  tenant_id: input.tenant_id,
  name: input.name,
  movement_category: input.movement_category,
  progression_level: input.progression_level,
  exercise_type: input.exercise_type,
  benchmark_target: input.benchmark_target ?? null,
  conversion_factor: input.conversion_factor ?? null,
  created_at: now,
  updated_at: now,
})
```

**Step 3: Update CreateUserBenchmarkInput interface**

```typescript
export interface CreateUserBenchmarkInput {
  tenant_id: string;
  user_id: string;
  benchmark_name: string;
  benchmark_value: number;
  benchmark_unit: BenchmarkUnit;
}

export interface UserBenchmarkRecord {
  id: string;
  tenant_id: string;
  user_id: string;
  benchmark_name: string;
  benchmark_value: number;
  benchmark_unit: string;
}
```

**Step 4: Update upsertUserBenchmark function**

Replace `master_exercise_id` and `one_rep_max_weight` with new fields:
```typescript
export async function upsertUserBenchmark(
  db: Kysely<Database>,
  input: CreateUserBenchmarkInput
): Promise<UserBenchmarkRecord | undefined> {
  const now = new Date().toISOString();

  const existing = await db
    .selectFrom('user_benchmarks')
    .where('tenant_id', '=', input.tenant_id)
    .where('user_id', '=', input.user_id)
    .where('benchmark_name', '=', input.benchmark_name)
    .selectAll()
    .executeTakeFirst();

  if (existing) {
    const result = await db
      .updateTable('user_benchmarks')
      .set({
        benchmark_value: input.benchmark_value,
        benchmark_unit: input.benchmark_unit,
        updated_at: now,
      })
      .where('id', '=', existing.id)
      .returningAll()
      .executeTakeFirst();

    return result;
  }

  const id = crypto.randomUUID();
  const result = await db
    .insertInto('user_benchmarks')
    .values({
      id,
      tenant_id: input.tenant_id,
      user_id: input.user_id,
      benchmark_name: input.benchmark_name,
      benchmark_value: input.benchmark_value,
      benchmark_unit: input.benchmark_unit,
      created_at: now,
      updated_at: now,
    })
    .returningAll()
    .executeTakeFirst();

  return result;
}
```

**Step 5: Update or remove getExerciseWithMaster**

Since we're moving to benchmark_target, this function may need adjustment:
```typescript
export interface GetExerciseByBenchmarkTargetInput {
  tenant_id: string;
  benchmark_target: string;
}

export async function getExercisesByBenchmarkTarget(
  db: Kysely<Database>,
  input: GetExerciseByBenchmarkTargetInput
): Promise<ExerciseDictionaryRecord[]> {
  return db
    .selectFrom('exercise_dictionary')
    .where('tenant_id', '=', input.tenant_id)
    .where('benchmark_target', '=', input.benchmark_target)
    .selectAll()
    .execute();
}
```

---

## Task 4: Update tRPC Router

**Files:**
- Modify: `src/trpc/routers/libraryRouter.ts`

**Step 1: Add new Zod schemas**

```typescript
const exerciseTypeSchema = z.enum(['dynamic', 'isometric', 'eccentric']);
const benchmarkUnitSchema = z.enum(['kg', 'lbs', 'seconds']);

const addExerciseSchema = z.object({
  name: z.string().min(1),
  movement_category: movementCategorySchema,
  progression_level: z.number().int().min(1),
  exercise_type: exerciseTypeSchema,
  benchmark_target: z.string().optional(),
  conversion_factor: z.number().positive().optional(),
});

const saveUserBenchmarkSchema = z.object({
  benchmark_name: z.string().min(1),
  benchmark_value: z.number().positive(),
  benchmark_unit: benchmarkUnitSchema,
});
```

**Step 2: Update addExercise mutation**

```typescript
addExercise: protectedProcedure
  .input(addExerciseSchema)
  .mutation(async ({ ctx, input }) => {
    return createExercise(ctx.db, {
      tenant_id: ctx.tenantId,
      name: input.name,
      movement_category: input.movement_category as MovementCategory,
      progression_level: input.progression_level,
      exercise_type: input.exercise_type as ExerciseType,
      benchmark_target: input.benchmark_target,
      conversion_factor: input.conversion_factor,
    });
  }),
```

**Step 3: Update saveUserBenchmark mutation**

```typescript
saveUserBenchmark: protectedProcedure
  .input(saveUserBenchmarkSchema)
  .mutation(async ({ ctx, input }) => {
    return upsertUserBenchmark(ctx.db, {
      tenant_id: ctx.tenantId,
      user_id: ctx.userId,
      benchmark_name: input.benchmark_name,
      benchmark_value: input.benchmark_value,
      benchmark_unit: input.benchmark_unit,
    });
  }),
```

**Step 4: Add new getExercises query (optional but useful)**

```typescript
getExercises: protectedProcedure
  .query(async ({ ctx }) => {
    return db
      .selectFrom('exercise_dictionary')
      .where('tenant_id', '=', ctx.tenantId)
      .selectAll()
      .orderBy('movement_category')
      .orderBy('progression_level')
      .execute();
  }),
```

---

## Task 5: Write Integration Tests

**Files:**
- Modify: `tests/trpc/routers/libraryRouter.test.ts`

**Step 1: Add test for isometric exercise with time-based benchmark**

```typescript
describe('Hybrid benchmarks (weighted + isometric)', () => {
  it('should save isometric benchmark with seconds unit', async () => {
    const mockBenchmark = {
      id: 'benchmark-isometric-1',
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      benchmark_name: 'Planche',
      benchmark_value: 15,
      benchmark_unit: 'seconds',
    };

    const mockDb = {
      selectFrom: vi.fn(() => ({
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              selectAll: vi.fn(() => ({
                executeTakeFirst: vi.fn(async () => undefined),
              })),
            })),
          })),
        })),
      })),
      insertInto: vi.fn(() => ({
        values: vi.fn(() => ({
          returningAll: vi.fn(() => ({
            executeTakeFirst: vi.fn(async () => mockBenchmark),
          })),
        })),
      })),
    } as unknown as Kysely<Database>;

    const ctx = {
      session: { userId: 'user-1', tenantId: 'tenant-1' },
      tenantId: 'tenant-1',
      userId: 'user-1',
      db: mockDb,
    };

    const caller = createCaller(ctx);
    const result = await caller.saveUserBenchmark({
      benchmark_name: 'Planche',
      benchmark_value: 15,
      benchmark_unit: 'seconds',
    });

    expect(result).toBeDefined();
    expect(result!.benchmark_name).toBe('Planche');
    expect(result!.benchmark_value).toBe(15);
    expect(result!.benchmark_unit).toBe('seconds');
  });

  it('should create isometric exercise with correct exercise_type', async () => {
    const mockIsometricExercise = {
      id: 'tuck-planche-id',
      tenant_id: 'tenant-1',
      name: 'Tuck Planche',
      movement_category: 'push',
      progression_level: 3,
      exercise_type: 'isometric',
      benchmark_target: 'Planche',
      conversion_factor: 1.0,
    };

    const mockDb = {
      insertInto: vi.fn(() => ({
        values: vi.fn(() => ({
          returningAll: vi.fn(() => ({
            executeTakeFirst: vi.fn(async () => mockIsometricExercise),
          })),
        })),
      })),
    } as unknown as Kysely<Database>;

    const ctx = {
      session: { userId: 'user-1', tenantId: 'tenant-1' },
      tenantId: 'tenant-1',
      userId: 'user-1',
      db: mockDb,
    };

    const caller = createCaller(ctx);
    const result = await caller.addExercise({
      name: 'Tuck Planche',
      movement_category: 'push',
      progression_level: 3,
      exercise_type: 'isometric',
      benchmark_target: 'Planche',
      conversion_factor: 1.0,
    });

    expect(result).toBeDefined();
    expect(result!.exercise_type).toBe('isometric');
    expect(result!.benchmark_target).toBe('Planche');
  });

  it('should handle weighted benchmark with kg unit', async () => {
    const mockBenchmark = {
      id: 'benchmark-weighted-1',
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      benchmark_name: 'Squat',
      benchmark_value: 100,
      benchmark_unit: 'kg',
    };

    const mockDb = {
      selectFrom: vi.fn(() => ({
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              selectAll: vi.fn(() => ({
                executeTakeFirst: vi.fn(async () => undefined),
              })),
            })),
          })),
        })),
      })),
      insertInto: vi.fn(() => ({
        values: vi.fn(() => ({
          returningAll: vi.fn(() => ({
            executeTakeFirst: vi.fn(async () => mockBenchmark),
          })),
        })),
      })),
    } as unknown as Kysely<Database>;

    const ctx = {
      session: { userId: 'user-1', tenantId: 'tenant-1' },
      tenantId: 'tenant-1',
      userId: 'user-1',
      db: mockDb,
    };

    const caller = createCaller(ctx);
    const result = await caller.saveUserBenchmark({
      benchmark_name: 'Squat',
      benchmark_value: 100,
      benchmark_unit: 'kg',
    });

    expect(result!.benchmark_value).toBe(100);
    expect(result!.benchmark_unit).toBe('kg');
  });
});
```

**Step 2: Update existing test mocks**

Update all mock objects to include new fields:
- Add `exercise_type` to exercise mocks
- Replace `master_exercise_id` with `benchmark_target` where appropriate
- Replace `one_rep_max_weight` with `benchmark_value` + `benchmark_unit`

**Step 3: Run tests to verify all pass**

Run: `npm run test`
Expected: All tests pass

---

## Task 6: Run Type Check and Final Verification

**Step 1: Run type generation**

Run: `npm run generate`
Expected: Types updated successfully

**Step 2: Run TypeScript check**

Run: `npm run types`
Expected: No errors

**Step 3: Run all tests**

Run: `npm run test`
Expected: All tests pass

**Step 4: Commit changes**

```bash
git add src/db/migrations/0004_hybrid_benchmarks.sql
git add src/db/schema.ts
git add src/services/exerciseDictionary.service.ts
git add src/trpc/routers/libraryRouter.ts
git add tests/trpc/routers/libraryRouter.test.ts
git commit -m "feat: add hybrid benchmark support for weighted and isometric exercises

- Add exercise_type column (dynamic/isometric/eccentric) to exercise_dictionary
- Replace master_exercise_id FK with benchmark_target text field
- Replace one_rep_max_weight with unit-agnostic benchmark_value + benchmark_unit
- Update service layer and tRPC router for new schema
- Add tests for isometric exercises with time-based benchmarks"
```

---

## Summary of Schema Changes

### exercise_dictionary
| Old Column | New Column | Notes |
|------------|------------|-------|
| master_exercise_id | benchmark_target | TEXT, e.g., "Planche", "Squat" |
| - | exercise_type | 'dynamic', 'isometric', 'eccentric' |

### user_benchmarks
| Old Column | New Column | Notes |
|------------|------------|-------|
| master_exercise_id | benchmark_name | TEXT, e.g., "Planche", "Back Squat" |
| one_rep_max_weight | benchmark_value | REAL |
| - | benchmark_unit | 'kg', 'lbs', 'seconds' |
