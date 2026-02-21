# Training Manager - Database Schema & Kysely Services

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the data layer for a SaaS-ready hybrid training manager, including database schema, Kysely services for CRUD operations, and ACWR calculation.

**Architecture:** SQLite via Cloudflare D1 with Kysely query builder. Multi-tenant design with tenant_id on core tables. Training load calculated as duration * sRPE. ACWR uses 7-day acute / 28-day chronic workload ratio.

**Tech Stack:** RedwoodSDK, Cloudflare D1, Kysely, Vitest, dbAuth

---

## Prerequisites

Before starting, ensure you have:
- Node.js 18+ installed
- wrangler CLI (`npm install -g wrangler`)

---

## Task 0: Initialize RedwoodSDK Project

**Files:**
- Create: `package.json` (via CLI)
- Create: `wrangler.jsonc` (via CLI)
- Create: `src/` directory structure (via CLI)

**Step 1: Initialize project**

Run:
```bash
npx create-rwsdk@latest .
```

Follow prompts:
- Select "D1" for database
- Select "dbAuth" for authentication
- Select "Vitest" for testing

Expected: Project scaffolded with basic structure

**Step 2: Install Kysely and D1 adapter**

Run:
```bash
npm install kysely
```

Expected: kysely added to dependencies

**Step 3: Verify project structure**

Run:
```bash
ls -la src/
```

Expected: See `db/`, `auth/`, and other RedwoodSDK directories

**Step 4: Commit initialization**

```bash
git add .
git commit -m "chore: initialize RedwoodSDK project with D1 and dbAuth"
```

---

## Task 1: Database Schema Setup

**Files:**
- Create: `src/db/schema.ts`
- Create: `tests/db/schema.test.ts`
- Modify: `wrangler.jsonc` (D1 bindings if needed)

**Step 1: Write the schema definition**

Create `src/db/schema.ts`:

```typescript
import { Generated, ColumnType } from 'kysely';

export type Modality = 'strength' | 'rowing' | 'running' | 'cycling' | 'swimming' | 'other';

export interface UserTable {
  id: Generated<string>;
  email: string;
  tenant_id: string;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface DailyWellnessTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  date: string;
  rhr: number;
  hrv_rmssd: number;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface WorkoutSessionTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  date: string;
  modality: Modality;
  duration_minutes: number;
  srpe: number;
  training_load: Generated<number>;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface Database {
  user: UserTable;
  daily_wellness: DailyWellnessTable;
  workout_session: WorkoutSessionTable;
}
```

**Step 2: Write failing test for schema types**

Create `tests/db/schema.test.ts`:

```typescript
import { describe, it, expectTypeOf } from 'vitest';
import type { Database, Modality } from '../../src/db/schema';

describe('Database Schema Types', () => {
  it('should have correct Modality types', () => {
    type ExpectedModality = 'strength' | 'rowing' | 'running' | 'cycling' | 'swimming' | 'other';
    expectTypeOf<Modality>().toEqualTypeOf<ExpectedModality>();
  });

  it('should have user table with tenant_id', () => {
    expectTypeOf<Database['user']['tenant_id']>().toBeString();
  });

  it('should have daily_wellness with rhr and hrv_rmssd', () => {
    expectTypeOf<Database['daily_wellness']['rhr']>().toBeNumber();
    expectTypeOf<Database['daily_wellness']['hrv_rmssd']>().toBeNumber();
  });

  it('should have workout_session with computed training_load', () => {
    expectTypeOf<Database['workout_session']['training_load']>().toBeNumber();
    expectTypeOf<Database['workout_session']['srpe']>().toBeNumber();
    expectTypeOf<Database['workout_session']['duration_minutes']>().toBeNumber();
  });
});
```

**Step 3: Run test to verify types**

Run:
```bash
npm test tests/db/schema.test.ts
```

Expected: All tests pass (type checking only)

**Step 4: Create D1 migration file**

Create `migrations/0001_initial_schema.sql`:

```sql
-- User table (dbAuth compatible)
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_user_tenant ON user(tenant_id);

-- Daily Wellness table
CREATE TABLE IF NOT EXISTS daily_wellness (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  rhr REAL NOT NULL,
  hrv_rmssd REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, user_id, date)
);

CREATE INDEX idx_daily_wellness_tenant_date ON daily_wellness(tenant_id, date);
CREATE INDEX idx_daily_wellness_user ON daily_wellness(user_id);

-- Workout Session table
CREATE TABLE IF NOT EXISTS workout_session (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  modality TEXT NOT NULL CHECK (modality IN ('strength', 'rowing', 'running', 'cycling', 'swimming', 'other')),
  duration_minutes INTEGER NOT NULL,
  srpe INTEGER NOT NULL CHECK (srpe >= 1 AND srpe <= 10),
  training_load INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_workout_session_tenant_date ON workout_session(tenant_id, date);
CREATE INDEX idx_workout_session_user ON workout_session(user_id);
```

**Step 5: Apply migration locally**

Run:
```bash
npx wrangler d1 migrations apply training-manager-db --local
```

Expected: Migration applied successfully

**Step 6: Generate Kysely types from D1**

Run:
```bash
npx wrangler d1 execute training-manager-db --local --command="SELECT * FROM pragma_table_info('user')" > /dev/null
npm run db:types
```

Note: If `db:types` script doesn't exist, create it in package.json:
```json
"scripts": {
  "db:types": "kysely-codegen --out-file ./src/db/generated-types.ts --dialect sqlite"
}
```

**Step 7: Commit schema**

```bash
git add src/db/schema.ts tests/db/schema.test.ts migrations/0001_initial_schema.sql
git commit -m "feat(db): add initial schema for users, daily_wellness, workout_session"
```

---

## Task 2: DailyWellness Kysely Service

**Files:**
- Create: `src/services/dailyWellness.service.ts`
- Create: `tests/services/dailyWellness.service.test.ts`

**Step 1: Write the failing test - create record**

Create `tests/services/dailyWellness.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createDailyWellness, calculateHrvRatio } from '../../src/services/dailyWellness.service';
import type { Kysely } from 'kysely';
import type { Database } from '../../src/db/schema';

// Mock database for testing
const mockDb = {
  insertInto: () => ({
    values: () => ({
      returning: () => ({
        executeTakeFirst: async () => ({ id: 'test-id', rhr: 55, hrv_rmssd: 45 })
      })
    })
  })
} as unknown as Kysely<Database>;

describe('DailyWellness Service', () => {
  describe('calculateHrvRatio', () => {
    it('should calculate HRV/RHR ratio correctly', () => {
      const rhr = 55;
      const hrvRmssd = 45;
      const result = calculateHrvRatio(hrvRmssd, rhr);
      expect(result).toBeCloseTo(0.818, 2);
    });

    it('should return 0 when RHR is 0 (edge case)', () => {
      const result = calculateHrvRatio(45, 0);
      expect(result).toBe(0);
    });
  });

  describe('createDailyWellness', () => {
    it('should create a daily wellness record with required fields', async () => {
      const input = {
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45
      };

      const result = await createDailyWellness(mockDb, input);
      expect(result).toBeDefined();
      expect(result?.rhr).toBe(55);
      expect(result?.hrv_rmssd).toBe(45);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test tests/services/dailyWellness.service.test.ts
```

Expected: FAIL - module not found or function not exported

**Step 3: Implement DailyWellness service**

Create `src/services/dailyWellness.service.ts`:

```typescript
import type { Kysely } from 'kysely';
import type { Database, DailyWellnessTable } from '../db/schema';
import { randomUUID } from 'crypto';

export interface CreateDailyWellnessInput {
  tenant_id: string;
  user_id: string;
  date: string;
  rhr: number;
  hrv_rmssd: number;
}

export type DailyWellnessRecord = Omit<DailyWellnessTable, 'created_at' | 'updated_at'> & {
  hrv_ratio: number;
};

export function calculateHrvRatio(hrvRmssd: number, rhr: number): number {
  if (rhr === 0) return 0;
  return hrvRmssd / rhr;
}

export async function createDailyWellness(
  db: Kysely<Database>,
  input: CreateDailyWellnessInput
): Promise<DailyWellnessRecord | undefined> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const hrv_ratio = calculateHrvRatio(input.hrv_rmssd, input.rhr);

  const result = await db
    .insertInto('daily_wellness')
    .values({
      id,
      ...input,
      created_at: now,
      updated_at: now
    })
    .returningAll()
    .executeTakeFirst();

  if (!result) return undefined;

  return {
    ...result,
    hrv_ratio
  };
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test tests/services/dailyWellness.service.test.ts
```

Expected: All tests PASS

**Step 5: Write additional test - get by date**

Add to `tests/services/dailyWellness.service.test.ts`:

```typescript
import { getDailyWellnessByDate } from '../../src/services/dailyWellness.service';

// Add to existing mockDb
const mockDbWithSelect = {
  ...mockDb,
  selectFrom: () => ({
    where: () => ({
      where: () => ({
        where: () => ({
          selectAll: () => ({
            executeTakeFirst: async () => ({
              id: 'test-id',
              tenant_id: 'tenant-1',
              user_id: 'user-1',
              date: '2026-02-21',
              rhr: 55,
              hrv_rmssd: 45
            })
          })
        })
      })
    })
  })
} as unknown as Kysely<Database>;

describe('getDailyWellnessByDate', () => {
  it('should fetch wellness record by tenant, user, and date', async () => {
    const result = await getDailyWellnessByDate(mockDbWithSelect, {
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      date: '2026-02-21'
    });
    expect(result).toBeDefined();
    expect(result?.rhr).toBe(55);
  });
});
```

**Step 6: Implement getDailyWellnessByDate**

Add to `src/services/dailyWellness.service.ts`:

```typescript
export interface GetDailyWellnessInput {
  tenant_id: string;
  user_id: string;
  date: string;
}

export async function getDailyWellnessByDate(
  db: Kysely<Database>,
  input: GetDailyWellnessInput
): Promise<DailyWellnessRecord | undefined> {
  const result = await db
    .selectFrom('daily_wellness')
    .where('tenant_id', '=', input.tenant_id)
    .where('user_id', '=', input.user_id)
    .where('date', '=', input.date)
    .selectAll()
    .executeTakeFirst();

  if (!result) return undefined;

  return {
    ...result,
    hrv_ratio: calculateHrvRatio(result.hrv_rmssd, result.rhr)
  };
}
```

**Step 7: Run all tests**

Run:
```bash
npm test tests/services/dailyWellness.service.test.ts
```

Expected: All tests PASS

**Step 8: Commit DailyWellness service**

```bash
git add src/services/dailyWellness.service.ts tests/services/dailyWellness.service.test.ts
git commit -m "feat(services): add DailyWellness Kysely service with HRV ratio calculation"
```

---

## Task 3: WorkoutSession Kysely Service

**Files:**
- Create: `src/services/workoutSession.service.ts`
- Create: `tests/services/workoutSession.service.test.ts`

**Step 1: Write the failing test - create with training load**

Create `tests/services/workoutSession.service.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createWorkoutSession, calculateTrainingLoad } from '../../src/services/workoutSession.service';
import type { Kysely } from 'kysely';
import type { Database } from '../../src/db/schema';

const mockDb = {
  insertInto: () => ({
    values: () => ({
      returning: () => ({
        executeTakeFirst: async () => ({
          id: 'test-id',
          tenant_id: 'tenant-1',
          user_id: 'user-1',
          date: '2026-02-21',
          modality: 'strength',
          duration_minutes: 60,
          srpe: 7,
          training_load: 420
        })
      })
    })
  })
} as unknown as Kysely<Database>;

describe('WorkoutSession Service', () => {
  describe('calculateTrainingLoad', () => {
    it('should calculate training load as duration * sRPE', () => {
      const result = calculateTrainingLoad(60, 7);
      expect(result).toBe(420);
    });

    it('should handle zero duration', () => {
      const result = calculateTrainingLoad(0, 7);
      expect(result).toBe(0);
    });

    it('should handle minimum sRPE', () => {
      const result = calculateTrainingLoad(30, 1);
      expect(result).toBe(30);
    });

    it('should handle maximum sRPE', () => {
      const result = calculateTrainingLoad(30, 10);
      expect(result).toBe(300);
    });
  });

  describe('createWorkoutSession', () => {
    it('should create session with auto-calculated training load', async () => {
      const input = {
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        date: '2026-02-21',
        modality: 'strength' as const,
        duration_minutes: 60,
        srpe: 7
      };

      const result = await createWorkoutSession(mockDb, input);
      expect(result).toBeDefined();
      expect(result?.training_load).toBe(420);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test tests/services/workoutSession.service.test.ts
```

Expected: FAIL - module not found

**Step 3: Implement WorkoutSession service**

Create `src/services/workoutSession.service.ts`:

```typescript
import type { Kysely } from 'kysely';
import type { Database, WorkoutSessionTable, Modality } from '../db/schema';
import { randomUUID } from 'crypto';

export interface CreateWorkoutSessionInput {
  tenant_id: string;
  user_id: string;
  date: string;
  modality: Modality;
  duration_minutes: number;
  srpe: number;
}

export type WorkoutSessionRecord = Omit<WorkoutSessionTable, 'created_at' | 'updated_at'>;

export function calculateTrainingLoad(durationMinutes: number, srpe: number): number {
  return durationMinutes * srpe;
}

export async function createWorkoutSession(
  db: Kysely<Database>,
  input: CreateWorkoutSessionInput
): Promise<WorkoutSessionRecord | undefined> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const training_load = calculateTrainingLoad(input.duration_minutes, input.srpe);

  const result = await db
    .insertInto('workout_session')
    .values({
      id,
      ...input,
      training_load,
      created_at: now,
      updated_at: now
    })
    .returningAll()
    .executeTakeFirst();

  return result;
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test tests/services/workoutSession.service.test.ts
```

Expected: All tests PASS

**Step 5: Write additional test - get sessions by date range**

Add to `tests/services/workoutSession.service.test.ts`:

```typescript
import { getWorkoutSessionsByDateRange } from '../../src/services/workoutSession.service';

const mockDbWithSelect = {
  ...mockDb,
  selectFrom: () => ({
    where: () => ({
      where: () => ({
        where: () => ({
          where: () => ({
            where: () => ({
              selectAll: () => ({
                execute: async () => [
                  { id: '1', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-19', modality: 'strength', duration_minutes: 60, srpe: 7, training_load: 420 },
                  { id: '2', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-20', modality: 'running', duration_minutes: 45, srpe: 6, training_load: 270 }
                ]
              })
            })
          })
        })
      })
    })
  })
} as unknown as Kysely<Database>;

describe('getWorkoutSessionsByDateRange', () => {
  it('should fetch sessions within date range for tenant', async () => {
    const result = await getWorkoutSessionsByDateRange(mockDbWithSelect, {
      tenant_id: 'tenant-1',
      start_date: '2026-02-01',
      end_date: '2026-02-28'
    });
    expect(result).toHaveLength(2);
    expect(result[0].training_load).toBe(420);
  });
});
```

**Step 6: Implement getWorkoutSessionsByDateRange**

Add to `src/services/workoutSession.service.ts`:

```typescript
export interface GetSessionsByDateRangeInput {
  tenant_id: string;
  start_date: string;
  end_date: string;
  user_id?: string;
}

export async function getWorkoutSessionsByDateRange(
  db: Kysely<Database>,
  input: GetSessionsByDateRangeInput
): Promise<WorkoutSessionRecord[]> {
  let query = db
    .selectFrom('workout_session')
    .where('tenant_id', '=', input.tenant_id)
    .where('date', '>=', input.start_date)
    .where('date', '<=', input.end_date);

  if (input.user_id) {
    query = query.where('user_id', '=', input.user_id);
  }

  return query.selectAll().execute();
}
```

**Step 7: Run all tests**

Run:
```bash
npm test tests/services/workoutSession.service.test.ts
```

Expected: All tests PASS

**Step 8: Commit WorkoutSession service**

```bash
git add src/services/workoutSession.service.ts tests/services/workoutSession.service.test.ts
git commit -m "feat(services): add WorkoutSession Kysely service with training load calculation"
```

---

## Task 4: ACWR Calculation Service

**Files:**
- Create: `src/services/acwr.service.ts`
- Create: `tests/services/acwr.service.test.ts`

**Step 1: Write the failing test - ACWR calculation**

Create `tests/services/acwr.service.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateACWR, calculateAcuteLoad, calculateChronicLoad, isDangerZone } from '../../src/services/acwr.service';
import type { Kysely } from 'kysely';
import type { Database } from '../../src/db/schema';

describe('ACWR Service', () => {
  describe('isDangerZone', () => {
    it('should return true when ratio exceeds 1.5', () => {
      expect(isDangerZone(1.6)).toBe(true);
    });

    it('should return false when ratio is at or below 1.5', () => {
      expect(isDangerZone(1.5)).toBe(false);
      expect(isDangerZone(1.2)).toBe(false);
    });
  });

  describe('calculateAcuteLoad', () => {
    it('should return 7-day sum of training loads', () => {
      const sessions = [
        { date: '2026-02-21', training_load: 100 },
        { date: '2026-02-20', training_load: 150 },
        { date: '2026-02-19', training_load: 200 },
        { date: '2026-02-18', training_load: 100 },
        { date: '2026-02-17', training_load: 50 },
        { date: '2026-02-16', training_load: 100 },
        { date: '2026-02-15', training_load: 200 },
      ];
      const result = calculateAcuteLoad(sessions);
      expect(result).toBe(900);
    });

    it('should only count sessions within 7-day window', () => {
      const sessions = [
        { date: '2026-02-21', training_load: 100 },
        { date: '2026-02-14', training_load: 500 }, // Outside 7-day window from 2026-02-21
      ];
      const result = calculateAcuteLoad(sessions, '2026-02-21');
      expect(result).toBe(100);
    });
  });

  describe('calculateChronicLoad', () => {
    it('should return 28-day average of training loads', () => {
      // 28 days * 100 = 2800 total / 28 = 100 average
      const sessions = Array(28).fill(null).map((_, i) => ({
        date: `2026-02-${String(21 - i).padStart(2, '0')}`,
        training_load: 100
      }));
      const result = calculateChronicLoad(sessions);
      expect(result).toBe(100);
    });

    it('should handle sparse data (missing days)', () => {
      const sessions = [
        { date: '2026-02-21', training_load: 2800 },
      ];
      // Only 1 session with 2800 load, but over 28 days = 2800/28 = 100
      const result = calculateChronicLoad(sessions);
      expect(result).toBe(100);
    });
  });

  describe('calculateACWR', () => {
    it('should return correct ratio and danger flag', async () => {
      const mockDb = {
        selectFrom: () => ({
          where: () => ({
            where: () => ({
              where: () => ({
                select: () => ({
                  execute: async () => [
                    { training_load: 700 } // 7-day sum
                  ]
                })
              })
            })
          })
        })
      } as unknown as Kysely<Database>;

      const result = await calculateACWR(mockDb, {
        tenant_id: 'tenant-1',
        date: '2026-02-21',
        chronic_load: 400 // 28-day avg
      });

      expect(result.ratio).toBeCloseTo(1.75, 2);
      expect(result.isDanger).toBe(true);
      expect(result.acute_load).toBe(700);
      expect(result.chronic_load).toBe(400);
    });

    it('should return ratio of 0 when chronic load is 0', async () => {
      const mockDb = {
        selectFrom: () => ({
          where: () => ({
            where: () => ({
              where: () => ({
                select: () => ({
                  execute: async () => [{ training_load: 100 }]
                })
              })
            })
          })
        })
      } as unknown as Kysely<Database>;

      const result = await calculateACWR(mockDb, {
        tenant_id: 'tenant-1',
        date: '2026-02-21',
        chronic_load: 0
      });

      expect(result.ratio).toBe(0);
      expect(result.isDanger).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test tests/services/acwr.service.test.ts
```

Expected: FAIL - module not found

**Step 3: Implement ACWR service**

Create `src/services/acwr.service.ts`:

```typescript
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema';
import { getWorkoutSessionsByDateRange } from './workoutSession.service';

export interface ACWRInput {
  tenant_id: string;
  user_id?: string;
  date: string;
}

export interface ACWRResult {
  acute_load: number;
  chronic_load: number;
  ratio: number;
  isDanger: boolean;
}

export function isDangerZone(ratio: number): boolean {
  return ratio > 1.5;
}

export function calculateAcuteLoad(
  sessions: Array<{ date: string; training_load: number }>,
  referenceDate?: string
): number {
  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const sevenDaysAgo = new Date(refDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  return sessions
    .filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= sevenDaysAgo && sessionDate <= refDate;
    })
    .reduce((sum, s) => sum + s.training_load, 0);
}

export function calculateChronicLoad(
  sessions: Array<{ date: string; training_load: number }>,
  referenceDate?: string
): number {
  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const twentyEightDaysAgo = new Date(refDate);
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 27);

  const totalLoad = sessions
    .filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= twentyEightDaysAgo && sessionDate <= refDate;
    })
    .reduce((sum, s) => sum + s.training_load, 0);

  return totalLoad / 28;
}

export async function calculateACWR(
  db: Kysely<Database>,
  input: ACWRInput
): Promise<ACWRResult> {
  const refDate = new Date(input.date);
  
  const acuteStartDate = new Date(refDate);
  acuteStartDate.setDate(acuteStartDate.getDate() - 6);
  
  const chronicStartDate = new Date(refDate);
  chronicStartDate.setDate(chronicStartDate.getDate() - 27);

  const acuteSessions = await getWorkoutSessionsByDateRange(db, {
    tenant_id: input.tenant_id,
    start_date: acuteStartDate.toISOString().split('T')[0],
    end_date: input.date,
    user_id: input.user_id
  });

  const chronicSessions = await getWorkoutSessionsByDateRange(db, {
    tenant_id: input.tenant_id,
    start_date: chronicStartDate.toISOString().split('T')[0],
    end_date: input.date,
    user_id: input.user_id
  });

  const acute_load = calculateAcuteLoad(acuteSessions, input.date);
  const chronic_load = calculateChronicLoad(chronicSessions, input.date);
  
  const ratio = chronic_load === 0 ? 0 : acute_load / chronic_load;

  return {
    acute_load,
    chronic_load,
    ratio,
    isDanger: isDangerZone(ratio)
  };
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test tests/services/acwr.service.test.ts
```

Expected: All tests PASS

**Step 5: Run all tests together**

Run:
```bash
npm test tests/services/
```

Expected: All service tests PASS

**Step 6: Commit ACWR service**

```bash
git add src/services/acwr.service.ts tests/services/acwr.service.test.ts
git commit -m "feat(services): add ACWR calculation service with danger zone detection"
```

---

## Task 5: Create Service Index and Final Verification

**Files:**
- Create: `src/services/index.ts`
- Modify: `package.json` (scripts if needed)

**Step 1: Create service barrel file**

Create `src/services/index.ts`:

```typescript
export * from './dailyWellness.service';
export * from './workoutSession.service';
export * from './acwr.service';
```

**Step 2: Run full test suite**

Run:
```bash
npm test
```

Expected: All tests PASS

**Step 3: Run lint/typecheck**

Run:
```bash
npm run lint
npm run typecheck
```

Expected: No errors

**Step 4: Final commit**

```bash
git add src/services/index.ts
git commit -m "feat(services): add barrel export for all services"
```

---

## Summary

| Task | Description | Files Created |
|------|-------------|---------------|
| 0 | Initialize RedwoodSDK | `package.json`, `wrangler.jsonc`, `src/` |
| 1 | Database Schema | `src/db/schema.ts`, `migrations/0001_initial_schema.sql` |
| 2 | DailyWellness Service | `src/services/dailyWellness.service.ts` |
| 3 | WorkoutSession Service | `src/services/workoutSession.service.ts` |
| 4 | ACWR Service | `src/services/acwr.service.ts` |
| 5 | Service Index | `src/services/index.ts` |

---

## Verification Checklist

- [x] All migrations applied successfully to local D1
- [x] Kysely types generated (schema.ts)
- [x] All services have corresponding tests (25 tests, 4 files)
- [x] Training load calculation: `duration_minutes * sRPE`
- [x] ACWR: acute (7-day sum) / chronic (28-day avg)
- [x] Danger flag: `ratio > 1.5`
- [x] All tables include `tenant_id` for multi-tenancy

---

## Implementation Notes (Deviations from Plan)

### Authentication (Task 0)

**Plan said:** "Select 'dbAuth' for authentication"

**Reality:** RedwoodSDK does not have "dbAuth". The CLI (`create-rwsdk@latest`) doesn't have interactive prompts for auth selection.

**Solution:** Authentication will use RedwoodSDK's `defineDurableSession` with Durable Objects. This is documented in the RedwoodSDK docs under "Authentication" section. A `UserSession` Durable Object will manage session state with `getSession()`, `saveSession()`, and `revokeSession()` methods.

### UUID Generation

**Plan said:** `import { randomUUID } from 'crypto'`

**Reality:** Node's `randomUUID` doesn't work in Cloudflare Workers runtime.

**Solution:** Use `crypto.randomUUID()` (Web Crypto API) which is available in the Workers runtime.

### training_load Type

**Plan said:** `training_load: Generated<number>`

**Reality:** `training_load` is application-computed (duration * sRPE), not database-generated.

**Solution:** Changed to `training_load: number` in the TypeScript schema.

### Status

**Completed:** 2026-02-21
**Tests:** 25 passing
**Commits:** 9
**Repository:** https://github.com/jimiryquai/training-manager
