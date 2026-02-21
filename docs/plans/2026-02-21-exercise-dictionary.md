# Exercise Dictionary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a progression-based exercise dictionary with self-referencing master/child relationships and user benchmarks.

**Architecture:** Two new tables (exercise_dictionary, user_benchmarks) with multi-tenancy. Exercise dictionary uses self-referencing FK for master exercise relationships. Service layer handles Kysely operations, tRPC router exposes queries/mutations.

**Tech Stack:** Kysely, tRPC, Zod, Vitest, D1/SQLite

---

### Task 1: Database Migration

**Files:**
- Create: `src/db/migrations/0003_exercise_dictionary.sql`

**Step 1: Write migration SQL**

Create the migration file with both tables:

```sql
-- Exercise Dictionary table with self-referencing FK
CREATE TABLE IF NOT EXISTS exercise_dictionary (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  movement_category TEXT NOT NULL,
  progression_level INTEGER NOT NULL,
  master_exercise_id TEXT,
  conversion_factor REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (master_exercise_id) REFERENCES exercise_dictionary(id) ON DELETE SET NULL
);

CREATE INDEX idx_exercise_dictionary_tenant ON exercise_dictionary(tenant_id);
CREATE INDEX idx_exercise_dictionary_master ON exercise_dictionary(master_exercise_id);
CREATE UNIQUE INDEX idx_exercise_dictionary_tenant_name ON exercise_dictionary(tenant_id, name);

-- User Benchmarks table
CREATE TABLE IF NOT EXISTS user_benchmarks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  master_exercise_name TEXT NOT NULL,
  one_rep_max_weight REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_user_benchmarks_tenant ON user_benchmarks(tenant_id);
CREATE INDEX idx_user_benchmarks_user ON user_benchmarks(user_id);
CREATE UNIQUE INDEX idx_user_benchmarks_user_exercise ON user_benchmarks(tenant_id, user_id, master_exercise_name);
```

**Step 2: Verify migration syntax**

Run: `cat src/db/migrations/0003_exercise_dictionary.sql`

---

### Task 2: Schema Types

**Files:**
- Modify: `src/db/schema.ts`

**Step 1: Add MovementCategory type**

Add after the existing `Modality` type (around line 4):

```typescript
export type MovementCategory = 'squat' | 'hinge' | 'push' | 'pull' | 'carry' | 'core' | 'cardio';
```

**Step 2: Add ExerciseDictionaryTable interface**

Add after `WorkoutSessionTable` (around line 42):

```typescript
export interface ExerciseDictionaryTable {
  id: Generated<string>;
  tenant_id: string;
  name: string;
  movement_category: MovementCategory;
  progression_level: number;
  master_exercise_id: string | null;
  conversion_factor: number | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}
```

**Step 3: Add UserBenchmarksTable interface**

Add after `ExerciseDictionaryTable`:

```typescript
export interface UserBenchmarksTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  master_exercise_name: string;
  one_rep_max_weight: number;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}
```

**Step 4: Update Database interface**

Update the Database interface to include new tables:

```typescript
export interface Database {
  user: UserTable;
  daily_wellness: DailyWellnessTable;
  workout_session: WorkoutSessionTable;
  exercise_dictionary: ExerciseDictionaryTable;
  user_benchmarks: UserBenchmarksTable;
}
```

**Step 5: Verify types compile**

Run: `npx tsc --noEmit src/db/schema.ts`

---

### Task 3: Exercise Dictionary Service

**Files:**
- Create: `src/services/exerciseDictionary.service.ts`
- Modify: `src/services/index.ts`

**Step 1: Write the service**

Create `src/services/exerciseDictionary.service.ts`:

```typescript
import type { Kysely } from 'kysely';
import type { Database, MovementCategory } from '../db/schema';

export interface CreateExerciseInput {
  tenant_id: string;
  name: string;
  movement_category: MovementCategory;
  progression_level: number;
  master_exercise_id?: string | null;
  conversion_factor?: number | null;
}

export interface ExerciseDictionaryRecord {
  id: string;
  tenant_id: string;
  name: string;
  movement_category: MovementCategory;
  progression_level: number;
  master_exercise_id: string | null;
  conversion_factor: number | null;
}

export async function createExercise(
  db: Kysely<Database>,
  input: CreateExerciseInput
): Promise<ExerciseDictionaryRecord | undefined> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const result = await db
    .insertInto('exercise_dictionary')
    .values({
      id,
      tenant_id: input.tenant_id,
      name: input.name,
      movement_category: input.movement_category,
      progression_level: input.progression_level,
      master_exercise_id: input.master_exercise_id ?? null,
      conversion_factor: input.conversion_factor ?? null,
      created_at: now,
      updated_at: now,
    })
    .returningAll()
    .executeTakeFirst();

  return result;
}

export interface GetExercisesByCategoryInput {
  tenant_id: string;
  movement_category: MovementCategory;
}

export async function getExercisesByCategory(
  db: Kysely<Database>,
  input: GetExercisesByCategoryInput
): Promise<ExerciseDictionaryRecord[]> {
  return db
    .selectFrom('exercise_dictionary')
    .where('tenant_id', '=', input.tenant_id)
    .where('movement_category', '=', input.movement_category)
    .selectAll()
    .execute();
}

export interface GetExerciseByIdInput {
  tenant_id: string;
  id: string;
}

export async function getExerciseById(
  db: Kysely<Database>,
  input: GetExerciseByIdInput
): Promise<ExerciseDictionaryRecord | undefined> {
  return db
    .selectFrom('exercise_dictionary')
    .where('tenant_id', '=', input.tenant_id)
    .where('id', '=', input.id)
    .selectAll()
    .executeTakeFirst();
}

export interface GetExerciseWithMasterInput {
  tenant_id: string;
  id: string;
}

export interface ExerciseWithMaster extends ExerciseDictionaryRecord {
  master_exercise: ExerciseDictionaryRecord | null;
}

export async function getExerciseWithMaster(
  db: Kysely<Database>,
  input: GetExerciseWithMasterInput
): Promise<ExerciseWithMaster | undefined> {
  const exercise = await getExerciseById(db, input);
  
  if (!exercise) return undefined;
  if (!exercise.master_exercise_id) {
    return { ...exercise, master_exercise: null };
  }

  const masterExercise = await getExerciseById(db, {
    tenant_id: input.tenant_id,
    id: exercise.master_exercise_id,
  });

  return {
    ...exercise,
    master_exercise: masterExercise ?? null,
  };
}
```

**Step 2: Export from services index**

Add to `src/services/index.ts`:

```typescript
export * from './exerciseDictionary.service';
```

**Step 3: Verify service compiles**

Run: `npx tsc --noEmit src/services/exerciseDictionary.service.ts`

---

### Task 4: User Benchmarks Service

**Files:**
- Modify: `src/services/exerciseDictionary.service.ts`

**Step 1: Add user benchmarks functions**

Append to `src/services/exerciseDictionary.service.ts`:

```typescript
export interface CreateUserBenchmarkInput {
  tenant_id: string;
  user_id: string;
  master_exercise_name: string;
  one_rep_max_weight: number;
}

export interface UserBenchmarkRecord {
  id: string;
  tenant_id: string;
  user_id: string;
  master_exercise_name: string;
  one_rep_max_weight: number;
}

export async function upsertUserBenchmark(
  db: Kysely<Database>,
  input: CreateUserBenchmarkInput
): Promise<UserBenchmarkRecord | undefined> {
  const now = new Date().toISOString();

  const existing = await db
    .selectFrom('user_benchmarks')
    .where('tenant_id', '=', input.tenant_id)
    .where('user_id', '=', input.user_id)
    .where('master_exercise_name', '=', input.master_exercise_name)
    .selectAll()
    .executeTakeFirst();

  if (existing) {
    const result = await db
      .updateTable('user_benchmarks')
      .set({
        one_rep_max_weight: input.one_rep_max_weight,
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
      master_exercise_name: input.master_exercise_name,
      one_rep_max_weight: input.one_rep_max_weight,
      created_at: now,
      updated_at: now,
    })
    .returningAll()
    .executeTakeFirst();

  return result;
}
```

**Step 2: Verify service compiles**

Run: `npx tsc --noEmit src/services/exerciseDictionary.service.ts`

---

### Task 5: Library Router

**Files:**
- Create: `src/trpc/routers/libraryRouter.ts`
- Modify: `src/trpc/routers/index.ts`

**Step 1: Write the router**

Create `src/trpc/routers/libraryRouter.ts`:

```typescript
import { z } from 'zod';
import { router } from '../trpc';
import { protectedProcedure } from '../trpc';
import {
  createExercise,
  getExercisesByCategory,
  getExerciseWithMaster,
  upsertUserBenchmark,
} from '../../services/exerciseDictionary.service';
import type { MovementCategory } from '../../db/schema';

const movementCategorySchema = z.enum(['squat', 'hinge', 'push', 'pull', 'carry', 'core', 'cardio']);

const addExerciseSchema = z.object({
  name: z.string().min(1),
  movement_category: movementCategorySchema,
  progression_level: z.number().int().min(1),
  master_exercise_id: z.string().optional(),
  conversion_factor: z.number().positive().optional(),
});

const getExercisesByCategorySchema = z.object({
  movement_category: movementCategorySchema,
});

const getExerciseWithMasterSchema = z.object({
  id: z.string(),
});

const saveUserBenchmarkSchema = z.object({
  master_exercise_name: z.string().min(1),
  one_rep_max_weight: z.number().positive(),
});

export const libraryRouter = router({
  addExercise: protectedProcedure
    .input(addExerciseSchema)
    .mutation(async ({ ctx, input }) => {
      return createExercise(ctx.db, {
        tenant_id: ctx.tenantId,
        name: input.name,
        movement_category: input.movement_category as MovementCategory,
        progression_level: input.progression_level,
        master_exercise_id: input.master_exercise_id,
        conversion_factor: input.conversion_factor,
      });
    }),

  getExercisesByCategory: protectedProcedure
    .input(getExercisesByCategorySchema)
    .query(async ({ ctx, input }) => {
      return getExercisesByCategory(ctx.db, {
        tenant_id: ctx.tenantId,
        movement_category: input.movement_category as MovementCategory,
      });
    }),

  getExerciseWithMaster: protectedProcedure
    .input(getExerciseWithMasterSchema)
    .query(async ({ ctx, input }) => {
      return getExerciseWithMaster(ctx.db, {
        tenant_id: ctx.tenantId,
        id: input.id,
      });
    }),

  saveUserBenchmark: protectedProcedure
    .input(saveUserBenchmarkSchema)
    .mutation(async ({ ctx, input }) => {
      return upsertUserBenchmark(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        master_exercise_name: input.master_exercise_name,
        one_rep_max_weight: input.one_rep_max_weight,
      });
    }),
});
```

**Step 2: Export from routers index**

Update `src/trpc/routers/index.ts`:

```typescript
export { wellnessRouter } from './wellnessRouter';
export { trainingRouter } from './trainingRouter';
export { libraryRouter } from './libraryRouter';
```

**Step 3: Verify router compiles**

Run: `npx tsc --noEmit src/trpc/routers/libraryRouter.ts`

---

### Task 6: Integration Tests

**Files:**
- Create: `tests/trpc/routers/libraryRouter.test.ts`

**Step 1: Write the tests**

Create `tests/trpc/routers/libraryRouter.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { libraryRouter } from '../../../src/trpc/routers/libraryRouter';
import type { Kysely } from 'kysely';
import type { Database } from '../../../src/db/schema';

const mockMasterExercise = {
  id: 'master-squat-id',
  tenant_id: 'tenant-1',
  name: 'Back Squat',
  movement_category: 'squat',
  progression_level: 5,
  master_exercise_id: null,
  conversion_factor: null,
};

const mockChildExercise = {
  id: 'child-goblet-id',
  tenant_id: 'tenant-1',
  name: 'Goblet Squat',
  movement_category: 'squat',
  progression_level: 2,
  master_exercise_id: 'master-squat-id',
  conversion_factor: 0.7,
};

const mockBenchmark = {
  id: 'benchmark-1',
  tenant_id: 'tenant-1',
  user_id: 'user-1',
  master_exercise_name: 'Back Squat',
  one_rep_max_weight: 100,
};

const createMockDb = () => {
  const exercises: Record<string, any> = {
    'master-squat-id': mockMasterExercise,
    'child-goblet-id': mockChildExercise,
  };

  return {
    insertInto: vi.fn(() => ({
      values: vi.fn(() => ({
        returningAll: vi.fn(() => ({
          executeTakeFirst: vi.fn(async () => mockChildExercise),
        })),
      })),
    })),
    selectFrom: vi.fn(() => ({
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          selectAll: vi.fn(() => ({
            executeTakeFirst: vi.fn(async (id?: string) => {
              return mockChildExercise;
            }),
            execute: vi.fn(async () => [mockMasterExercise, mockChildExercise]),
          })),
        })),
      })),
    })),
  } as unknown as Kysely<Database>;
};

const createCaller = (ctx: any) => libraryRouter.createCaller(ctx);

describe('libraryRouter', () => {
  describe('addExercise', () => {
    it('should create a master exercise', async () => {
      const mockDb = {
        insertInto: vi.fn(() => ({
          values: vi.fn(() => ({
            returningAll: vi.fn(() => ({
              executeTakeFirst: vi.fn(async () => mockMasterExercise),
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
        name: 'Back Squat',
        movement_category: 'squat',
        progression_level: 5,
      });

      expect(result).toBeDefined();
      expect(result!.name).toBe('Back Squat');
      expect(result!.master_exercise_id).toBeNull();
    });

    it('should create a child exercise with master reference', async () => {
      const mockDb = {
        insertInto: vi.fn(() => ({
          values: vi.fn(() => ({
            returningAll: vi.fn(() => ({
              executeTakeFirst: vi.fn(async () => mockChildExercise),
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
        name: 'Goblet Squat',
        movement_category: 'squat',
        progression_level: 2,
        master_exercise_id: 'master-squat-id',
        conversion_factor: 0.7,
      });

      expect(result).toBeDefined();
      expect(result!.name).toBe('Goblet Squat');
      expect(result!.master_exercise_id).toBe('master-squat-id');
      expect(result!.conversion_factor).toBe(0.7);
    });
  });

  describe('getExercisesByCategory', () => {
    it('should fetch exercises by movement category', async () => {
      const mockDb = {
        selectFrom: vi.fn(() => ({
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              selectAll: vi.fn(() => ({
                execute: vi.fn(async () => [mockMasterExercise, mockChildExercise]),
              })),
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
      const result = await caller.getExercisesByCategory({
        movement_category: 'squat',
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].movement_category).toBe('squat');
    });
  });

  describe('getExerciseWithMaster', () => {
    it('should fetch exercise with master relationship', async () => {
      const mockDb = {
        selectFrom: vi.fn(() => ({
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              selectAll: vi.fn(() => ({
                executeTakeFirst: vi.fn(async () => mockChildExercise),
              })),
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
      const result = await caller.getExerciseWithMaster({
        id: 'child-goblet-id',
      });

      expect(result).toBeDefined();
      expect(result!.name).toBe('Goblet Squat');
      expect(result!.master_exercise_id).toBe('master-squat-id');
      expect(result!.conversion_factor).toBe(0.7);
    });
  });

  describe('saveUserBenchmark', () => {
    it('should create a user benchmark', async () => {
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
        master_exercise_name: 'Back Squat',
        one_rep_max_weight: 100,
      });

      expect(result).toBeDefined();
      expect(result!.master_exercise_name).toBe('Back Squat');
      expect(result!.one_rep_max_weight).toBe(100);
    });

    it('should update existing benchmark', async () => {
      const existingBenchmark = { ...mockBenchmark, one_rep_max_weight: 80 };
      
      const mockDb = {
        selectFrom: vi.fn(() => ({
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              where: vi.fn(() => ({
                selectAll: vi.fn(() => ({
                  executeTakeFirst: vi.fn(async () => existingBenchmark),
                })),
              })),
            })),
          })),
        })),
        updateTable: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returningAll: vi.fn(() => ({
                executeTakeFirst: vi.fn(async () => mockBenchmark),
              })),
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
        master_exercise_name: 'Back Squat',
        one_rep_max_weight: 100,
      });

      expect(result).toBeDefined();
      expect(result!.one_rep_max_weight).toBe(100);
    });
  });

  describe('Master/Child relationship verification', () => {
    it('should verify conversion factor calculation logic', async () => {
      const masterSquat = { ...mockMasterExercise, conversion_factor: null };
      const gobletSquat = { ...mockChildExercise, conversion_factor: 0.7 };

      expect(gobletSquat.master_exercise_id).toBe(masterSquat.id);
      expect(gobletSquat.conversion_factor).toBe(0.7);

      const estimatedMasterMax = 100;
      const estimatedGobletMax = estimatedMasterMax * gobletSquat.conversion_factor;
      
      expect(estimatedGobletMax).toBe(70);
    });
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `npm run test tests/trpc/routers/libraryRouter.test.ts`

---

### Task 7: Final Verification

**Step 1: Run all tests**

Run: `npm run test`

Expected: All tests pass

**Step 2: Type check**

Run: `npm run types`

Expected: No type errors

**Step 3: Commit**

```bash
git add src/db/migrations/0003_exercise_dictionary.sql \
        src/db/schema.ts \
        src/services/exerciseDictionary.service.ts \
        src/services/index.ts \
        src/trpc/routers/libraryRouter.ts \
        src/trpc/routers/index.ts \
        tests/trpc/routers/libraryRouter.test.ts

git commit -m "feat: add exercise dictionary with master/child relationships

- Add exercise_dictionary and user_benchmarks tables
- Create service layer with CRUD operations
- Add libraryRouter with getExercisesByCategory, addExercise, saveUserBenchmark
- Include integration tests verifying master/child relationships"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Database migration | `src/db/migrations/0003_exercise_dictionary.sql` |
| 2 | Schema types | `src/db/schema.ts` |
| 3 | Exercise dictionary service | `src/services/exerciseDictionary.service.ts` |
| 4 | User benchmarks service | `src/services/exerciseDictionary.service.ts` |
| 5 | Library router | `src/trpc/routers/libraryRouter.ts`, `src/trpc/routers/index.ts` |
| 6 | Integration tests | `tests/trpc/routers/libraryRouter.test.ts` |
| 7 | Final verification | Run tests, type check, commit |
