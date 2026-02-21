# App Structure & Subjective Metrics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the single-page MVP into a mobile-friendly two-route PWA with bottom tab navigation, and add six subjective fatigue metrics to wellness logging.

**Architecture:** Database migration adds nullable integer columns for 1-5 scale subjective scores. AppLayout provides bottom tab bar wrapping Dashboard and LogData routes. LogWellnessForm uses shadcn Slider components for visual metric input.

**Tech Stack:** RedwoodSDK routing with layout(), Kysely for database, Zod validation, shadcn/ui Slider, lucide-react icons

---

## Task 1: Database & API - Add Subjective Metrics

**Files:**
- Create: `src/db/migrations/0002_add_subjective_metrics.sql`
- Modify: `src/db/schema.ts`
- Modify: `src/services/dailyWellness.service.ts`
- Modify: `src/app/components/forms/schemas.ts`
- Modify: `src/trpc/routers/wellnessRouter.ts`
- Modify: `tests/services/dailyWellness.service.test.ts`
- Modify: `tests/trpc/routers/wellnessRouter.test.ts`

### Step 1: Write database migration

Create `src/db/migrations/0002_add_subjective_metrics.sql`:

```sql
-- Add subjective metrics columns to daily_wellness
ALTER TABLE daily_wellness ADD COLUMN sleep_score INTEGER CHECK(sleep_score IS NULL OR (sleep_score >= 1 AND sleep_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN fatigue_score INTEGER CHECK(fatigue_score IS NULL OR (fatigue_score >= 1 AND fatigue_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN muscle_soreness_score INTEGER CHECK(muscle_soreness_score IS NULL OR (muscle_soreness_score >= 1 AND muscle_soreness_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN stress_score INTEGER CHECK(stress_score IS NULL OR (stress_score >= 1 AND stress_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN mood_score INTEGER CHECK(mood_score IS NULL OR (mood_score >= 1 AND mood_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN diet_score INTEGER CHECK(diet_score IS NULL OR (diet_score >= 1 AND diet_score <= 5));
```

### Step 2: Update TypeScript schema

Modify `src/db/schema.ts` - add to `DailyWellnessTable` interface after `hrv_rmssd`:

```typescript
export interface DailyWellnessTable {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  date: string;
  rhr: number;
  hrv_rmssd: number;
  sleep_score: number | null;
  fatigue_score: number | null;
  muscle_soreness_score: number | null;
  stress_score: number | null;
  mood_score: number | null;
  diet_score: number | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}
```

### Step 3: Update service layer types

Modify `src/services/dailyWellness.service.ts`:

Update `CreateDailyWellnessInput` interface:

```typescript
export interface CreateDailyWellnessInput {
  tenant_id: string;
  user_id: string;
  date: string;
  rhr: number;
  hrv_rmssd: number;
  sleep_score?: number | null;
  fatigue_score?: number | null;
  muscle_soreness_score?: number | null;
  stress_score?: number | null;
  mood_score?: number | null;
  diet_score?: number | null;
}
```

Update `upsertDailyWellness` function's update set:

```typescript
.set({
  rhr: input.rhr,
  hrv_rmssd: input.hrv_rmssd,
  sleep_score: input.sleep_score ?? null,
  fatigue_score: input.fatigue_score ?? null,
  muscle_soreness_score: input.muscle_soreness_score ?? null,
  stress_score: input.stress_score ?? null,
  mood_score: input.mood_score ?? null,
  diet_score: input.diet_score ?? null,
  updated_at: now
})
```

### Step 4: Update Zod schema

Modify `src/app/components/forms/schemas.ts`:

```typescript
import { z } from 'zod';

const subjectiveScoreSchema = z.number().int().min(1).max(5).optional();

export const logWellnessSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  rhr: z.number().int().min(30).max(200),
  hrv_rmssd: z.number().min(0).max(200),
  sleep_score: subjectiveScoreSchema,
  fatigue_score: subjectiveScoreSchema,
  muscle_soreness_score: subjectiveScoreSchema,
  stress_score: subjectiveScoreSchema,
  mood_score: subjectiveScoreSchema,
  diet_score: subjectiveScoreSchema,
});

export const logWorkoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  modality: z.enum(['strength', 'rowing', 'running', 'cycling', 'swimming', 'other']),
  duration_minutes: z.number().int().min(1).max(480),
  srpe: z.number().int().min(1).max(10),
});

export type LogWellnessInput = z.infer<typeof logWellnessSchema>;
export type LogWorkoutInput = z.infer<typeof logWorkoutSchema>;
```

### Step 5: Update wellnessRouter

Modify `src/trpc/routers/wellnessRouter.ts`:

```typescript
import { z } from 'zod';
import { router } from '../trpc';
import { protectedProcedure } from '../trpc';
import { createDailyWellness, upsertDailyWellness, getDailyWellnessByDate, getDailyWellnessByDateRange } from '../../services/dailyWellness.service';

const subjectiveScoreSchema = z.number().int().min(1).max(5).optional();

const logDailyMetricsSchema = z.object({
  date: z.string(),
  rhr: z.number().positive(),
  hrv_rmssd: z.number().positive(),
  sleep_score: subjectiveScoreSchema,
  fatigue_score: subjectiveScoreSchema,
  muscle_soreness_score: subjectiveScoreSchema,
  stress_score: subjectiveScoreSchema,
  mood_score: subjectiveScoreSchema,
  diet_score: subjectiveScoreSchema,
});

const getMetricsByDateSchema = z.object({
  date: z.string(),
});

const getMetricsByDateRangeSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
});

export const wellnessRouter = router({
  logDailyMetrics: protectedProcedure
    .input(logDailyMetricsSchema)
    .mutation(async ({ ctx, input }) => {
      return upsertDailyWellness(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        date: input.date,
        rhr: input.rhr,
        hrv_rmssd: input.hrv_rmssd,
        sleep_score: input.sleep_score,
        fatigue_score: input.fatigue_score,
        muscle_soreness_score: input.muscle_soreness_score,
        stress_score: input.stress_score,
        mood_score: input.mood_score,
        diet_score: input.diet_score,
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

  getMetricsByDateRange: protectedProcedure
    .input(getMetricsByDateRangeSchema)
    .query(async ({ ctx, input }) => {
      return getDailyWellnessByDateRange(ctx.db, {
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        start_date: input.start_date,
        end_date: input.end_date,
      });
    }),
});
```

### Step 6: Run migration locally

Run: `npx wrangler d1 migrations apply training-manager-db --local`

Expected: Migration applied successfully

### Step 7: Run TypeScript check

Run: `npm run check`

Expected: No type errors

### Step 8: Update tests for wellnessRouter

Modify `tests/trpc/routers/wellnessRouter.test.ts` - update mockRecords to include new fields:

```typescript
const mockRecords = [
  { id: '1', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-19', rhr: 55, hrv_rmssd: 45, sleep_score: 4, fatigue_score: 2, muscle_soreness_score: 3, stress_score: 2, mood_score: 4, diet_score: 3, created_at: '2026-02-19T00:00:00.000Z', updated_at: '2026-02-19T00:00:00.000Z' },
  { id: '2', tenant_id: 'tenant-1', user_id: 'user-1', date: '2026-02-20', rhr: 54, hrv_rmssd: 47, sleep_score: 5, fatigue_score: 1, muscle_soreness_score: 2, stress_score: 1, mood_score: 5, diet_score: 4, created_at: '2026-02-20T00:00:00.000Z', updated_at: '2026-02-20T00:00:00.000Z' },
];
```

Add new test case:

```typescript
it('should accept wellness record with subjective scores', async () => {
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
    sleep_score: 4,
    fatigue_score: 2,
    muscle_soreness_score: 3,
    stress_score: 2,
    mood_score: 4,
    diet_score: 3,
  });

  expect(result).toBeDefined();
});
```

### Step 9: Run tests

Run: `npm run test`

Expected: All tests pass

### Step 10: Commit Task 1

```bash
git add src/db/migrations/0002_add_subjective_metrics.sql src/db/schema.ts src/services/dailyWellness.service.ts src/app/components/forms/schemas.ts src/trpc/routers/wellnessRouter.ts tests/
git commit -m "feat(db): add subjective metrics columns to daily_wellness"
```

---

## Task 2: App Layout & SPA Setup

**Files:**
- Create: `src/app/layouts/AppLayout.tsx`
- Modify: `src/worker.tsx`
- Modify: `src/client.tsx` (verify already configured)

### Step 1: Add shadcn Slider component

Run: `npx shadcn@latest add slider`

Expected: Slider component added to `src/app/components/ui/slider.tsx`

### Step 2: Create AppLayout component

Create `src/app/layouts/AppLayout.tsx`:

```tsx
import { ReactNode } from 'react';
import { LayoutDashboard, ClipboardList } from 'lucide-react';
import { linkFor } from 'rwsdk/router';

interface AppLayoutProps {
  children: ReactNode;
  currentPath: string;
}

const tabs = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/log', label: 'Log Data', icon: ClipboardList },
];

export function AppLayout({ children, currentPath }: AppLayoutProps) {
  return (
    <div className="min-h-screen pb-16">
      <main className="container mx-auto p-4">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          {tabs.map(({ path, label, icon: Icon }) => {
            const isActive = currentPath === path;
            return (
              <a
                key={path}
                href={linkFor(path)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs mt-1">{label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
```

### Step 3: Update worker.tsx routing

Modify `src/worker.tsx` - add layout import and wrap routes:

```tsx
import { render, route, layout } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";
import { defineDurableSession } from "rwsdk/auth";
import { env } from "cloudflare:workers";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

import { Document } from "@/app/document";
import { setCommonHeaders } from "@/app/headers";
import { Home } from "@/app/pages/home";
import { AppLayout } from "@/app/layouts/AppLayout";
import { createTRPCHandler } from "@/trpc/handler";
import { UserSession, type SessionData } from "./session/UserSession";
import type { Database } from "./db/schema";

export type AppContext = {
  session?: { userId: string; tenantId: string } | null;
};

export const sessionStore = defineDurableSession({
  sessionDurableObject: env.USER_SESSION_DO as unknown as DurableObjectNamespace<{
    getSession(): Promise<{ value: SessionData } | { error: string }>;
    saveSession(data: SessionData): Promise<SessionData>;
    revokeSession(): Promise<void>;
  } & Rpc.DurableObjectBranded>,
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
    
    if (!session && import.meta.env.DEV) {
      const cookies = request.headers.get("cookie") || "";
      const devSession = cookies.match(/dev_session=([^;]+)/)?.[1];
      if (devSession === "seed-user-001:seed-tenant-001") {
        ctx.session = {
          userId: "seed-user-001",
          tenantId: "seed-tenant-001",
        };
      }
    }
  },
  route("/trpc/*", async ({ request, ctx }) => {
    return trpcHandler(request, ctx.session ?? undefined);
  }),
  route("/dev-login", async ({ request }) => {
    if (!import.meta.env.DEV) {
      return new Response("Not found", { status: 404 });
    }
    const headers = new Headers({ Location: "/" });
    headers.set(
      "Set-Cookie",
      "dev_session=seed-user-001:seed-tenant-001; Path=/; HttpOnly; SameSite=Lax"
    );
    return new Response(null, { status: 302, headers });
  }),
  render(Document, [
    layout(({ url }) => <AppLayout currentPath={url.pathname}>{url.pathname === '/' ? <Home /> : null}</AppLayout>, [
      route("/", Home),
    ]),
  ]),
]);
```

### Step 4: Verify client.tsx

Verify `src/client.tsx` already has:

```tsx
import { initClient, initClientNavigation } from "rwsdk/client";

const { handleResponse, onHydrated } = initClientNavigation();
initClient({ handleResponse, onHydrated });
```

### Step 5: Run TypeScript check

Run: `npm run check`

Expected: No type errors

### Step 6: Commit Task 2

```bash
git add src/app/layouts/AppLayout.tsx src/worker.tsx src/app/components/ui/slider.tsx
git commit -m "feat(layout): add AppLayout with bottom tab navigation"
```

---

## Task 3: UI Split & Form Update

**Files:**
- Create: `src/app/pages/LogData.tsx`
- Modify: `src/app/pages/dashboard.tsx`
- Modify: `src/app/components/forms/LogWellnessForm.tsx`
- Modify: `src/worker.tsx`

### Step 1: Create LogData page

Create `src/app/pages/LogData.tsx`:

```tsx
'use client';

import { LogWellnessForm } from '@/app/components/forms/LogWellnessForm';
import { LogWorkoutForm } from '@/app/components/forms/LogWorkoutForm';
import { toast } from '@/app/hooks/use-toast';
import type { LogWellnessInput } from '@/app/components/forms/schemas';
import type { LogWorkoutInput } from '@/app/components/forms/schemas';

async function submitWellness(data: LogWellnessInput) {
  const response = await fetch('/trpc/wellness.logDailyMetrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save wellness data');
  return response.json();
}

async function submitWorkout(data: LogWorkoutInput) {
  const response = await fetch('/trpc/training.logSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save workout data');
  return response.json();
}

export function LogData() {
  const today = new Date().toISOString().split('T')[0];

  const handleWellnessSubmit = async (formData: LogWellnessInput) => {
    try {
      await submitWellness(formData);
      toast({ title: 'Success', description: 'Wellness data saved' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save wellness data', variant: 'destructive' });
    }
  };

  const handleWorkoutSubmit = async (formData: LogWorkoutInput) => {
    try {
      await submitWorkout(formData);
      toast({ title: 'Success', description: 'Workout data saved' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save workout data', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Log Data</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LogWellnessForm onSubmit={handleWellnessSubmit} defaultDate={today} />
        <LogWorkoutForm onSubmit={handleWorkoutSubmit} defaultDate={today} />
      </div>
    </div>
  );
}
```

### Step 2: Simplify Dashboard page

Modify `src/app/pages/dashboard.tsx` - remove form imports and handlers, keep only charts:

```tsx
'use client';

import { ACWRChart, FatigueChart } from '@/app/components/charts';
import { useReadinessData } from '@/app/hooks/useReadinessData';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

export function Dashboard() {
  const today = new Date().toISOString().split('T')[0];
  const { data, loading, error } = useReadinessData(today);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-destructive">Error loading dashboard: {error.message}</p>
      </div>
    );
  }

  const acwrMap = new Map(data?.acwrHistory?.map(a => [a.date, a]) ?? []);
  const chartData = data?.wellnessHistory.map((w) => {
    const acwr = acwrMap.get(w.date);
    return {
      date: w.date,
      ratio: acwr?.ratio ?? 0,
      acute_load: acwr?.acute_load ?? 0,
      chronic_load: acwr?.chronic_load ?? 0,
      rhr: w.rhr,
      hrv_rmssd: w.hrv_rmssd,
    };
  }) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Readiness Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ACWRChart data={chartData} />
        <FatigueChart data={chartData} />
      </div>

      {data?.acwr && (
        <Card>
          <CardHeader>
            <CardTitle>Current ACWR Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{data.acwr.acute_load.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Acute Load (7d)</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{data.acwr.chronic_load.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Chronic Load (28d avg)</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${data.acwr.isDanger ? 'text-destructive' : 'text-primary'}`}>
                  {data.acwr.ratio.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Ratio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### Step 3: Update LogWellnessForm with subjective sliders

Modify `src/app/components/forms/LogWellnessForm.tsx`:

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Slider } from '@/app/components/ui/slider';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { logWellnessSchema, type LogWellnessInput } from './schemas';

interface LogWellnessFormProps {
  onSubmit: (data: LogWellnessInput) => Promise<void>;
  defaultDate?: string;
}

const subjectiveMetrics = [
  { name: 'sleep_score', label: 'Sleep Quality', emoji: '😴', description: 'How well did you sleep?' },
  { name: 'fatigue_score', label: 'Fatigue Level', emoji: '🔋', description: 'How fatigued do you feel? (1=exhausted, 5=fresh)' },
  { name: 'muscle_soreness_score', label: 'Muscle Soreness', emoji: '💪', description: 'How sore are your muscles? (1=very sore, 5=no soreness)' },
  { name: 'stress_score', label: 'Stress Level', emoji: '😰', description: 'How stressed do you feel? (1=very stressed, 5=relaxed)' },
  { name: 'mood_score', label: 'Mood', emoji: '😊', description: 'How is your mood? (1=low, 5=great)' },
  { name: 'diet_score', label: 'Diet Quality', emoji: '🍎', description: 'How well have you been eating? (1=poor, 5=excellent)' },
] as const;

function getScoreColor(value: number): string {
  if (value <= 1) return 'text-red-500';
  if (value <= 2) return 'text-orange-500';
  if (value <= 3) return 'text-yellow-500';
  if (value <= 4) return 'text-lime-500';
  return 'text-green-500';
}

export function LogWellnessForm({ onSubmit, defaultDate }: LogWellnessFormProps) {
  const form = useForm<LogWellnessInput>({
    resolver: zodResolver(logWellnessSchema),
    defaultValues: {
      date: defaultDate || new Date().toISOString().split('T')[0],
      rhr: 60,
      hrv_rmssd: 40,
      sleep_score: 3,
      fatigue_score: 3,
      muscle_soreness_score: 3,
      stress_score: 3,
      mood_score: 3,
      diet_score: 3,
    },
  });

  const handleSubmit = async (data: LogWellnessInput) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Wellness</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rhr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resting HR (bpm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hrv_rmssd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HRV RMSSD (ms)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Subjective Metrics</h3>
              {subjectiveMetrics.map(({ name, label, emoji, description }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => {
                    const value = field.value ?? 3;
                    return (
                      <FormItem>
                        <div className="flex justify-between items-center mb-2">
                          <FormLabel className="flex items-center gap-2">
                            <span>{emoji}</span>
                            <span>{label}</span>
                          </FormLabel>
                          <span className={`font-bold ${getScoreColor(value)}`}>
                            {value}
                          </span>
                        </div>
                        <FormControl>
                          <Slider
                            min={1}
                            max={5}
                            step={1}
                            value={[value]}
                            onValueChange={([v]) => field.onChange(v)}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">{description}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              ))}
            </div>

            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
              {form.formState.isSubmitting ? 'Saving...' : 'Save Wellness'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

### Step 4: Update worker.tsx to add /log route

Modify `src/worker.tsx` - import LogData and add route:

Add import:
```tsx
import { LogData } from "@/app/pages/LogData";
```

Update layout routes:
```tsx
layout(({ url }) => <AppLayout currentPath={url.pathname}>{url.pathname === '/' ? <Home /> : url.pathname === '/log' ? <LogData /> : null}</AppLayout>, [
  route("/", Home),
  route("/log", LogData),
]),
```

### Step 5: Run TypeScript check

Run: `npm run check`

Expected: No type errors

### Step 6: Run tests

Run: `npm run test`

Expected: All tests pass

### Step 7: Commit Task 3

```bash
git add src/app/pages/LogData.tsx src/app/pages/dashboard.tsx src/app/components/forms/LogWellnessForm.tsx src/worker.tsx
git commit -m "feat(ui): split Dashboard and LogData pages, add subjective metric sliders"
```

---

## Final Verification

### Step 1: Full type check

Run: `npm run check`

Expected: All types pass

### Step 2: All tests pass

Run: `npm run test`

Expected: All tests pass

### Step 3: Manual dev server test

Run: `npm run dev`

Verify:
- [ ] Bottom tab bar appears on both pages
- [ ] Navigation between Dashboard and Log is instant (no page reload)
- [ ] Subjective sliders work with color feedback
- [ ] Form submission saves all metrics to database
