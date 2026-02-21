# Training Manager - tRPC API Layer

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expose the existing Kysely services via tRPC with end-to-end type safety and multi-tenant security.

**Architecture:** tRPC server integrated into RedwoodSDK worker. Context extracts tenant_id from Durable Object session. Protected procedures ensure every request is authenticated before calling Kysely services.

**Tech Stack:** tRPC v11, RedwoodSDK, Durable Objects for sessions, Kysely

---

## Prerequisites

Before starting, ensure you have:
- Completed the database schema and services (Tasks 0-5 from previous plan)
- Node.js 18+ installed

---

## Task 0: Install tRPC Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install tRPC server and fetch adapter**

Run:
```bash
npm install @trpc/server
```

Expected: @trpc/server added to dependencies

**Step 2: Verify installation**

Run:
```bash
npm list @trpc/server
```

Expected: Shows installed version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @trpc/server dependency"
```

---

## Task 1: Set Up Session Durable Object

**Files:**
- Create: `src/session/UserSession.ts`
- Modify: `wrangler.jsonc`
- Modify: `src/worker.tsx`

**Context:** We need a Durable Object to store user sessions with tenant_id. This is RedwoodSDK's approach to authentication - not "dbAuth".

**Step 1: Create the UserSession Durable Object**

Create `src/session/UserSession.ts`:

```typescript
export interface SessionData {
  userId: string;
  tenantId: string;
}

export class UserSession implements DurableObject {
  private storage: DurableObjectStorage;
  private session: SessionData | undefined;

  constructor(state: DurableObjectState) {
    this.storage = state.storage;
  }

  async getSession(): Promise<{ value: SessionData | null }> {
    if (!this.session) {
      this.session = await this.storage.get<SessionData>("session") ?? undefined;
    }
    return { value: this.session ?? null };
  }

  async saveSession(data: SessionData): Promise<SessionData> {
    this.session = data;
    await this.storage.put("session", data);
    return data;
  }

  async revokeSession(): Promise<void> {
    this.session = undefined;
    await this.storage.delete("session");
  }
}
```

**Step 2: Update wrangler.jsonc with Durable Object binding**

Add to `wrangler.jsonc` (inside the main object, after d1_databases):

```jsonc
"durable_objects": {
  "bindings": [
    { "name": "USER_SESSION_DO", "class_name": "UserSession" }
  ]
}
```

**Step 3: Generate types**

Run:
```bash
npm run generate
```

Expected: Types updated with USER_SESSION_DO binding

**Step 4: Export UserSession from worker**

Add to `src/worker.tsx`:

```typescript
import { defineDurableSession } from "rwsdk/auth";
import { UserSession } from "./session/UserSession";

export const sessionStore = defineDurableSession({
  sessionDurableObject: env.USER_SESSION_DO,
});

export { UserSession };
```

**Step 5: Commit**

```bash
git add src/session/UserSession.ts wrangler.jsonc src/worker.tsx
git commit -m "feat(session): add UserSession Durable Object for authentication"
```

---

## Task 2: Create tRPC Context and Base Setup

**Files:**
- Create: `src/trpc/context.ts`
- Create: `src/trpc/trpc.ts`
- Create: `tests/trpc/context.test.ts`

**Step 1: Write failing test for context creation**

Create `tests/trpc/context.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createTRPCContext } from '../../src/trpc/context';

describe('createTRPCContext', () => {
  it('should extract session from request', async () => {
    const mockSessionStore = {
      load: async () => ({ userId: 'user-1', tenantId: 'tenant-1' }),
    };

    const ctx = await createTRPCContext({
      sessionStore: mockSessionStore,
      db: {} as any,
    });

    expect(ctx.session).toEqual({ userId: 'user-1', tenantId: 'tenant-1' });
    expect(ctx.tenantId).toBe('tenant-1');
  });

  it('should return null session when not authenticated', async () => {
    const mockSessionStore = {
      load: async () => null,
    };

    const ctx = await createTRPCContext({
      sessionStore: mockSessionStore,
      db: {} as any,
    });

    expect(ctx.session).toBeNull();
    expect(ctx.tenantId).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test tests/trpc/context.test.ts
```

Expected: FAIL - module not found

**Step 3: Create tRPC context**

Create `src/trpc/context.ts`:

```typescript
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema';

export interface SessionData {
  userId: string;
  tenantId: string;
}

export interface SessionStore {
  load: (request: Request) => Promise<SessionData | null>;
}

export interface CreateContextOptions {
  sessionStore: SessionStore;
  db: Kysely<Database>;
  request?: Request;
}

export interface TRPCContext {
  session: SessionData | null;
  tenantId: string | null;
  userId: string | null;
  db: Kysely<Database>;
}

export async function createTRPCContext(opts: CreateContextOptions): Promise<TRPCContext> {
  const session = opts.request 
    ? await opts.sessionStore.load(opts.request)
    : null;

  return {
    session,
    tenantId: session?.tenantId ?? null,
    userId: session?.userId ?? null,
    db: opts.db,
  };
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test tests/trpc/context.test.ts
```

Expected: All tests PASS

**Step 5: Create tRPC base setup**

Create `src/trpc/trpc.ts`:

```typescript
import { initTRPC, TRPCError } from '@trpc/server';
import type { TRPCContext } from './context';

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.tenantId || !ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    },
  });
});
```

**Step 6: Run all tests**

Run:
```bash
npm test tests/trpc/
```

Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/trpc/context.ts src/trpc/trpc.ts tests/trpc/context.test.ts
git commit -m "feat(trpc): add context with protected procedure middleware"
```

---

## Task 3: Create Wellness Router

**Files:**
- Create: `src/trpc/routers/wellnessRouter.ts`
- Create: `tests/trpc/routers/wellnessRouter.test.ts`

**Step 1: Write failing test for wellness router**

Create `tests/trpc/routers/wellnessRouter.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { wellnessRouter } from '../../../src/trpc/routers/wellnessRouter';
import type { Kysely } from 'kysely';
import type { Database } from '../../../src/db/schema';

const mockDb = {
  insertInto: vi.fn(() => ({
    values: vi.fn(() => ({
      returningAll: vi.fn(() => ({
        executeTakeFirst: vi.fn(async () => ({
          id: 'test-id',
          tenant_id: 'tenant-1',
          user_id: 'user-1',
          date: '2026-02-21',
          rhr: 55,
          hrv_rmssd: 45,
        })),
      })),
    })),
  })),
  selectFrom: vi.fn(() => ({
    where: vi.fn(() => ({
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          selectAll: vi.fn(() => ({
            executeTakeFirst: vi.fn(async () => ({
              id: 'test-id',
              tenant_id: 'tenant-1',
              user_id: 'user-1',
              date: '2026-02-21',
              rhr: 55,
              hrv_rmssd: 45,
            })),
          })),
        })),
      })),
    })),
  })),
} as unknown as Kysely<Database>;

const createCaller = (ctx: any) => wellnessRouter.createCaller(ctx);

describe('wellnessRouter', () => {
  describe('logDailyMetrics', () => {
    it('should create a wellness record for authenticated user', async () => {
      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.logDailyMetrics({
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45,
      });

      expect(result).toBeDefined();
      expect(result.rhr).toBe(55);
    });

    it('should throw UNAUTHORIZED for unauthenticated user', async () => {
      const ctx = {
        session: null,
        tenantId: null,
        userId: null,
        db: mockDb,
      };

      const caller = createCaller(ctx);
      
      await expect(caller.logDailyMetrics({
        date: '2026-02-21',
        rhr: 55,
        hrv_rmssd: 45,
      })).rejects.toThrow('UNAUTHORIZED');
    });
  });

  describe('getMetricsByDate', () => {
    it('should fetch wellness record for authenticated user', async () => {
      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.getMetricsByDate({ date: '2026-02-21' });

      expect(result).toBeDefined();
      expect(result?.rhr).toBe(55);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test tests/trpc/routers/wellnessRouter.test.ts
```

Expected: FAIL - module not found

**Step 3: Create wellness router**

Create `src/trpc/routers/wellnessRouter.ts`:

```typescript
import { z } from 'zod';
import { router } from '../trpc';
import { protectedProcedure } from '../trpc';
import { createDailyWellness, getDailyWellnessByDate } from '../../services/dailyWellness.service';

const logDailyMetricsSchema = z.object({
  date: z.string(),
  rhr: z.number().positive(),
  hrv_rmssd: z.number().positive(),
});

const getMetricsByDateSchema = z.object({
  date: z.string(),
});

export const wellnessRouter = router({
  logDailyMetrics: protectedProcedure
    .input(logDailyMetricsSchema)
    .mutation(async ({ ctx, input }) => {
      return createDailyWellness(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        date: input.date,
        rhr: input.rhr,
        hrv_rmssd: input.hrv_rmssd,
      });
    }),

  getMetricsByDate: protectedProcedure
    .input(getMetricsByDateSchema)
    .query(async ({ ctx, input }) => {
      return getDailyWellnessByDate(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        date: input.date,
      });
    }),
});
```

**Step 4: Install zod for input validation**

Run:
```bash
npm install zod
```

**Step 5: Run test to verify it passes**

Run:
```bash
npm test tests/trpc/routers/wellnessRouter.test.ts
```

Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/trpc/routers/wellnessRouter.ts tests/trpc/routers/wellnessRouter.test.ts package.json package-lock.json
git commit -m "feat(trpc): add wellnessRouter with logDailyMetrics and getMetricsByDate"
```

---

## Task 4: Create Training Router

**Files:**
- Create: `src/trpc/routers/trainingRouter.ts`
- Create: `tests/trpc/routers/trainingRouter.test.ts`

**Step 1: Write failing test for training router**

Create `tests/trpc/routers/trainingRouter.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { trainingRouter } from '../../../src/trpc/routers/trainingRouter';
import type { Kysely } from 'kysely';
import type { Database } from '../../../src/db/schema';

const createMockDb = () => ({
  insertInto: vi.fn(() => ({
    values: vi.fn(() => ({
      returningAll: vi.fn(() => ({
        executeTakeFirst: vi.fn(async () => ({
          id: 'test-id',
          tenant_id: 'tenant-1',
          user_id: 'user-1',
          date: '2026-02-21',
          modality: 'strength',
          duration_minutes: 60,
          srpe: 7,
          training_load: 420,
        })),
      })),
    })),
  })),
  selectFrom: vi.fn(() => ({
    where: vi.fn(() => ({
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            selectAll: vi.fn(() => ({
              execute: vi.fn(async () => [
                { date: '2026-02-21', training_load: 420 },
                { date: '2026-02-20', training_load: 300 },
              ]),
            })),
          })),
        })),
      })),
    })),
  })),
} as unknown as Kysely<Database>;

const createCaller = (ctx: any) => trainingRouter.createCaller(ctx);

describe('trainingRouter', () => {
  describe('logSession', () => {
    it('should create a workout session for authenticated user', async () => {
      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: createMockDb(),
      };

      const caller = createCaller(ctx);
      const result = await caller.logSession({
        date: '2026-02-21',
        modality: 'strength',
        duration_minutes: 60,
        srpe: 7,
      });

      expect(result).toBeDefined();
      expect(result?.training_load).toBe(420);
    });

    it('should throw UNAUTHORIZED for unauthenticated user', async () => {
      const ctx = {
        session: null,
        tenantId: null,
        userId: null,
        db: createMockDb(),
      };

      const caller = createCaller(ctx);
      
      await expect(caller.logSession({
        date: '2026-02-21',
        modality: 'strength',
        duration_minutes: 60,
        srpe: 7,
      })).rejects.toThrow('UNAUTHORIZED');
    });
  });

  describe('getACWRStatus', () => {
    it('should return ACWR data for authenticated user', async () => {
      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: createMockDb(),
      };

      const caller = createCaller(ctx);
      const result = await caller.getACWRStatus({ date: '2026-02-21' });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('acute_load');
      expect(result).toHaveProperty('chronic_load');
      expect(result).toHaveProperty('ratio');
      expect(result).toHaveProperty('isDanger');
      expect(typeof result.isDanger).toBe('boolean');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test tests/trpc/routers/trainingRouter.test.ts
```

Expected: FAIL - module not found

**Step 3: Create training router**

Create `src/trpc/routers/trainingRouter.ts`:

```typescript
import { z } from 'zod';
import { router } from '../trpc';
import { protectedProcedure } from '../trpc';
import { createWorkoutSession } from '../../services/workoutSession.service';
import { calculateACWR } from '../../services/acwr.service';
import type { Modality } from '../../db/schema';

const logSessionSchema = z.object({
  date: z.string(),
  modality: z.enum(['strength', 'rowing', 'running', 'cycling', 'swimming', 'other']),
  duration_minutes: z.number().int().positive(),
  srpe: z.number().int().min(1).max(10),
});

const getACWRStatusSchema = z.object({
  date: z.string(),
});

export const trainingRouter = router({
  logSession: protectedProcedure
    .input(logSessionSchema)
    .mutation(async ({ ctx, input }) => {
      return createWorkoutSession(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        date: input.date,
        modality: input.modality as Modality,
        duration_minutes: input.duration_minutes,
        srpe: input.srpe,
      });
    }),

  getACWRStatus: protectedProcedure
    .input(getACWRStatusSchema)
    .query(async ({ ctx, input }) => {
      return calculateACWR(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        date: input.date,
      });
    }),
});
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test tests/trpc/routers/trainingRouter.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/trpc/routers/trainingRouter.ts tests/trpc/routers/trainingRouter.test.ts
git commit -m "feat(trpc): add trainingRouter with logSession and getACWRStatus"
```

---

## Task 5: Create App Router and Integrate with Worker

**Files:**
- Create: `src/trpc/routers/index.ts`
- Create: `src/trpc/appRouter.ts`
- Create: `src/trpc/handler.ts`
- Modify: `src/worker.tsx`

**Step 1: Create router barrel file**

Create `src/trpc/routers/index.ts`:

```typescript
export { wellnessRouter } from './wellnessRouter';
export { trainingRouter } from './trainingRouter';
```

**Step 2: Create app router (combines all routers)**

Create `src/trpc/appRouter.ts`:

```typescript
import { router } from './trpc';
import { wellnessRouter } from './routers/wellnessRouter';
import { trainingRouter } from './routers/trainingRouter';

export const appRouter = router({
  wellness: wellnessRouter,
  training: trainingRouter,
});

export type AppRouter = typeof appRouter;
```

**Step 3: Create tRPC handler for RedwoodSDK**

Create `src/trpc/handler.ts`:

```typescript
import { createHTTPHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from './appRouter';
import { createTRPCContext, type SessionStore } from './context';
import type { Kysely } from 'kysely';
import type { Database } from '../db/schema';

export interface CreateHandlerOptions {
  sessionStore: SessionStore;
  db: Kysely<Database>;
}

export function createTRPCHandler(opts: CreateHandlerOptions) {
  return createHTTPHandler({
    router: appRouter,
    createContext: async ({ req }) => {
      return createTRPCContext({
        sessionStore: opts.sessionStore,
        db: opts.db,
        request: req,
      });
    },
  });
}
```

**Step 4: Update worker.tsx to integrate tRPC**

Replace `src/worker.tsx` with:

```typescript
import { render, route } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import { defineDurableSession } from "rwsdk/auth";
import { env } from "cloudflare:workers";

import { Document } from "@/app/document";
import { setCommonHeaders } from "@/app/headers";
import { Home } from "@/app/pages/home";
import { createTRPCHandler } from "@/trpc/handler";
import { UserSession } from "./session/UserSession";
import type { Database } from "./db/schema";

export type AppContext = {
  session?: { userId: string; tenantId: string } | null;
};

export const sessionStore = defineDurableSession({
  sessionDurableObject: env.USER_SESSION_DO,
});

export { UserSession };

function getDb() {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: env.DB }),
  });
}

const trpcHandler = createTRPCHandler({
  sessionStore,
  db: getDb(),
});

export default defineApp([
  setCommonHeaders(),
  async function sessionMiddleware({ request, ctx }) {
    const session = await sessionStore.load(request);
    ctx.session = session;
  },
  route("/trpc/*", async ({ request }) => {
    const url = new URL(request.url);
    const path = url.pathname.replace("/trpc/", "");
    
    const response = await trpcHandler(
      new Request(new URL(path, url.origin) + url.search, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      })
    );
    
    return response;
  }),
  render(Document, [route("/", Home)]),
]);
```

**Step 5: Install kysely-d1 dialect**

Run:
```bash
npm install kysely-d1
```

**Step 6: Run all tests**

Run:
```bash
npm test
```

Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/trpc/routers/index.ts src/trpc/appRouter.ts src/trpc/handler.ts src/worker.tsx package.json package-lock.json
git commit -m "feat(trpc): integrate tRPC with RedwoodSDK worker"
```

---

## Task 6: Final Verification and Export Types

**Files:**
- Create: `src/trpc/index.ts`

**Step 1: Create tRPC barrel export**

Create `src/trpc/index.ts`:

```typescript
export { appRouter, type AppRouter } from './appRouter';
export { createTRPCContext, type TRPCContext, type SessionData } from './context';
export { createTRPCHandler } from './handler';
export { publicProcedure, protectedProcedure } from './trpc';
export { wellnessRouter } from './routers/wellnessRouter';
export { trainingRouter } from './routers/trainingRouter';
```

**Step 2: Run full test suite**

Run:
```bash
npm test
```

Expected: All tests PASS

**Step 3: Run type check**

Run:
```bash
npm run types
```

Expected: No errors

**Step 4: Final commit**

```bash
git add src/trpc/index.ts
git commit -m "feat(trpc): add barrel exports for tRPC API layer"
```

---

## Summary

| Task | Description | Files Created |
|------|-------------|---------------|
| 0 | Install tRPC | `package.json` |
| 1 | Session Durable Object | `src/session/UserSession.ts` |
| 2 | tRPC Context | `src/trpc/context.ts`, `src/trpc/trpc.ts` |
| 3 | Wellness Router | `src/trpc/routers/wellnessRouter.ts` |
| 4 | Training Router | `src/trpc/routers/trainingRouter.ts` |
| 5 | Integration | `src/trpc/appRouter.ts`, `src/trpc/handler.ts` |
| 6 | Exports | `src/trpc/index.ts` |

---

## API Endpoints

After implementation, the following tRPC procedures will be available at `/trpc/*`:

### Wellness Router
- `wellness.logDailyMetrics` (mutation) - Log morning metrics (RHR, HRV)
- `wellness.getMetricsByDate` (query) - Fetch metrics for a date

### Training Router
- `training.logSession` (mutation) - Log a workout session
- `training.getACWRStatus` (query) - Get ACWR ratio and danger status

---

## Verification Checklist

- [x] tRPC installed and configured
- [x] UserSession Durable Object created
- [x] Protected procedures enforce authentication
- [x] All routers use existing Kysely services (no duplicate logic)
- [x] Every procedure extracts tenant_id from session context
- [x] All tests passing (33 tests)
- [x] Type exports ready for frontend consumption

---

## Deviations from Plan

The following deviations were required during implementation:

### Task 1: UserSession Durable Object

1. **Missing `fetch` method** - The DurableObject interface requires a `fetch` method. Added HTTP endpoint handler for session operations (GET/POST/DELETE on `/session`).

2. **sessionStore type mismatch** - rwsdk's `defineDurableSession` expects `DurableObjectNamespace<DurableObjectMethods>` which requires branded types. Fixed with type casting:
   ```typescript
   env.USER_SESSION_DO as unknown as DurableObjectNamespace<{
     getSession(): Promise<{ value: SessionData } | { error: string }>;
     saveSession(data: SessionData): Promise<SessionData>;
     revokeSession(): Promise<void>;
   } & Rpc.DurableObjectBranded>
   ```

3. **Missing migrations config** - wrangler.jsonc needed a `migrations` section for Durable Objects:
   ```jsonc
   "migrations": [{ "tag": "v1", "new_sqlite_classes": ["UserSession"] }]
   ```

### Task 3 & 4: Router Tests

1. **Error message assertion** - Tests expected `.toThrow('UNAUTHORIZED')` but the actual error message is `'You must be logged in to access this resource'`. Updated test assertions to match actual message.

2. **MockDb type syntax** - Arrow function return type `as unknown as Kysely<Database>` caused parse errors. Changed to separate function with explicit return type annotation.

### Task 5: tRPC Handler

1. **Wrong API name** - tRPC v11 exports `fetchRequestHandler` (not `createHTTPHandler`). Updated handler to use correct API.

2. **Handler wrapper** - `fetchRequestHandler` requires `req` and `endpoint` in options, so wrapped in a function that takes Request and returns Response.

3. **Simplified route handler** - Plan showed URL path manipulation, but `fetchRequestHandler` handles this internally when given the full request.

### Task 6: Type Safety

1. **Non-null assertion** - TypeScript flagged `result.rhr` as possibly undefined. Added `result!.rhr` assertion after `expect(result).toBeDefined()` check.
