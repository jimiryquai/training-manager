# Fate Composition & Frontend UI (Readiness Dashboard) Implementation Plan

> **Status: ✅ COMPLETE** (2026-02-21)
>
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Readiness Dashboard UI with Fate-powered backend view composition, Tailwind CSS v4 styling, and shadcn/ui components including wellness/workout logging forms and data visualization charts.

**Architecture:** Fate composes ACWR status and historical wellness metrics into a single typed ReadinessView exposed via tRPC. The frontend uses shadcn/ui forms for data entry and chart primitives for ACWR/Fatigue visualization. Single-request data fetching via Fate ensures optimal performance.

**Tech Stack:** @nkzw/fate, react-fate, Tailwind CSS v4, shadcn/ui, Recharts (via shadcn chart), Zod

---

## Deviation Log

| Task | Deviation | Reason | Resolution |
|------|-----------|--------|------------|
| 2 | Fate required `select` parameter not in spec | Fate's `createResolver` API requires this | Added optional `select` input field with default |
| 2 | Interfaces needed index signature | Fate's `AnyRecord` constraint | Added `[key: string]: unknown` to interfaces |
| 3 | Vite config was `vite.config.mts` not `.ts` | RedwoodSDK project structure | Used existing `.mts` file |
| 3 | Used `redwood()` plugin not `cloudflare()` | RedwoodSDK uses its own plugin | Used correct plugin for project |
| 4 | Used `sonner` instead of `toast` | shadcn deprecated toast component | Used recommended sonner replacement |
| 4 | `label` auto-installed | shadcn CLI dependency | Acceptable - form dependency |
| 9 | Used sonner wrapper for toasts | Consistent with Task 4 decision | Created simple wrapper hook |
| 9 | chartData uses same ACWR for all points | API only returns current ACWR | Acceptable MVP simplification |
| 10 | Bundle size warning (602KB) | Recharts + dependencies | Logged for future optimization |

---

## Prerequisites

Before starting, verify:
- [x] Existing tRPC routers (`wellnessRouter`, `trainingRouter`) are working
- [x] Database schema has `daily_wellness` and `workout_session` tables
- [x] Services exist: `calculateACWR`, `createDailyWellness`, `createWorkoutSession`

---

## Task 1: Add Historical Wellness Query ✅ COMPLETE

**Commit:** `3241f6b`

**Files:**
- Modify: `src/services/dailyWellness.service.ts`
- Modify: `src/trpc/routers/wellnessRouter.ts`
- Create: `tests/services/dailyWellness.service.test.ts` (add range query test)
- Modify: `tests/trpc/routers/wellnessRouter.test.ts`

**Step 1: Write the failing test for getDailyWellnessByDateRange**

```typescript
// In tests/services/dailyWellness.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getDailyWellnessByDateRange } from '../../src/services/dailyWellness.service';
import type { Kysely } from 'kysely';
import type { Database } from '../../src/db/schema';

describe('getDailyWellnessByDateRange', () => {
  it('should return wellness records within date range', async () => {
    const mockRecords = [
      { id: '1', tenant_id: 't1', user_id: 'u1', date: '2026-02-19', rhr: 55, hrv_rmssd: 45 },
      { id: '2', tenant_id: 't1', user_id: 'u1', date: '2026-02-20', rhr: 54, hrv_rmssd: 47 },
      { id: '3', tenant_id: 't1', user_id: 'u1', date: '2026-02-21', rhr: 53, hrv_rmssd: 50 },
    ];

    const mockDb = {
      selectFrom: vi.fn(() => ({
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              where: vi.fn(() => ({
                selectAll: vi.fn(() => ({
                  execute: vi.fn(async () => mockRecords),
                })),
              })),
            })),
          })),
        })),
      })),
    } as unknown as Kysely<Database>;

    const result = await getDailyWellnessByDateRange(mockDb, {
      tenant_id: 't1',
      user_id: 'u1',
      start_date: '2026-02-19',
      end_date: '2026-02-21',
    });

    expect(result).toHaveLength(3);
    expect(result[0].hrv_ratio).toBeCloseTo(45 / 55);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test tests/services/dailyWellness.service.test.ts`
Expected: FAIL with "getDailyWellnessByDateRange is not defined"

**Step 3: Write minimal implementation**

```typescript
// In src/services/dailyWellness.service.ts - add these exports:

export interface GetDailyWellnessRangeInput {
  tenant_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
}

export async function getDailyWellnessByDateRange(
  db: Kysely<Database>,
  input: GetDailyWellnessRangeInput
): Promise<DailyWellnessRecord[]> {
  const results = await db
    .selectFrom('daily_wellness')
    .where('tenant_id', '=', input.tenant_id)
    .where('user_id', '=', input.user_id)
    .where('date', '>=', input.start_date)
    .where('date', '<=', input.end_date)
    .selectAll()
    .execute();

  return results.map(r => ({
    ...r,
    hrv_ratio: calculateHrvRatio(r.hrv_rmssd, r.rhr)
  }));
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test tests/services/dailyWellness.service.test.ts`
Expected: PASS

**Step 5: Add tRPC endpoint for historical wellness**

```typescript
// In src/trpc/routers/wellnessRouter.ts - add import and schema:
import { getDailyWellnessByDateRange } from '../../services/dailyWellness.service';

const getMetricsByDateRangeSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
});

// Add to wellnessRouter:
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
```

**Step 6: Run all tests**

Run: `npm run test`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/services/dailyWellness.service.ts src/trpc/routers/wellnessRouter.ts tests/
git commit -m "feat: add getDailyWellnessByDateRange service and tRPC endpoint"
```

---

## Task 2: Install and Configure Fate ✅ COMPLETE

**Commit:** `ee36f58`

**Files:**
- Modify: `package.json`
- Create: `src/fate/views.ts`
- Create: `src/fate/dashboardRouter.ts`
- Modify: `src/trpc/appRouter.ts`
- Create: `tests/fate/dashboardRouter.test.ts`

**Step 1: Install Fate packages**

Run: `pnpm add @nkzw/fate react-fate`
Expected: Packages installed successfully

**Step 2: Create Fate data views**

```typescript
// src/fate/views.ts
import { dataView, list, resolver, type Entity } from '@nkzw/fate/server';

export interface ACWRData {
  acute_load: number;
  chronic_load: number;
  ratio: number;
  isDanger: boolean;
}

export interface WellnessMetric {
  id: string;
  date: string;
  rhr: number;
  hrv_rmssd: number;
  hrv_ratio: number;
}

export const ACWRView = dataView<ACWRData>('ACWR')({
  acute_load: true,
  chronic_load: true,
  ratio: true,
  isDanger: true,
});

export const WellnessMetricView = dataView<WellnessMetric>('WellnessMetric')({
  id: true,
  date: true,
  rhr: true,
  hrv_rmssd: true,
  hrv_ratio: true,
});

export interface ReadinessViewData {
  acwr: ACWRData;
  wellnessHistory: WellnessMetric[];
}

export const ReadinessView = dataView<ReadinessViewData>('Readiness')({
  acwr: ACWRView,
  wellnessHistory: list(WellnessMetricView),
});

export type ACWR = Entity<typeof ACWRView, 'ACWR'>;
export type WellnessMetricEntity = Entity<typeof WellnessMetricView, 'WellnessMetric'>;
export type Readiness = Entity<typeof ReadinessView, 'Readiness'>;
```

**Step 3: Create dashboard router with Fate integration**

```typescript
// src/fate/dashboardRouter.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc';
import { createResolver } from '@nkzw/fate/server';
import { calculateACWR } from '../services/acwr.service';
import { getDailyWellnessByDateRange } from '../services/dailyWellness.service';
import { ReadinessView } from './views';

const getReadinessViewSchema = z.object({
  date: z.string(),
  history_days: z.number().int().min(7).max(90).default(28),
});

export const dashboardRouter = router({
  getReadinessView: protectedProcedure
    .input(getReadinessViewSchema)
    .query(async ({ ctx, input }) => {
      const endDate = new Date(input.date);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - input.history_days + 1);

      const [acwrResult, wellnessHistory] = await Promise.all([
        calculateACWR(ctx.db, {
          tenant_id: ctx.tenantId,
          user_id: ctx.userId,
          date: input.date,
        }),
        getDailyWellnessByDateRange(ctx.db, {
          tenant_id: ctx.tenantId,
          user_id: ctx.userId,
          start_date: startDate.toISOString().split('T')[0],
          end_date: input.date,
        }),
      ]);

      const { resolve } = createResolver({
        ctx,
        view: ReadinessView,
      });

      return resolve({
        acwr: acwrResult,
        wellnessHistory,
      });
    }),
});
```

**Step 4: Update appRouter to include dashboard router**

```typescript
// src/trpc/appRouter.ts
import { router } from './trpc';
import { wellnessRouter } from './routers/wellnessRouter';
import { trainingRouter } from './routers/trainingRouter';
import { dashboardRouter } from '../fate/dashboardRouter';

export const appRouter = router({
  wellness: wellnessRouter,
  training: trainingRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
```

**Step 5: Write test for dashboard router**

```typescript
// tests/fate/dashboardRouter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { dashboardRouter } from '../../src/fate/dashboardRouter';
import type { Kysely } from 'kysely';
import type { Database } from '../../src/db/schema';

const mockDb = {
  selectFrom: vi.fn(() => ({
    where: vi.fn(() => ({
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            selectAll: vi.fn(() => ({
              execute: vi.fn(async () => [
                { id: '1', date: '2026-02-21', rhr: 55, hrv_rmssd: 45 },
              ]),
            })),
          })),
        })),
      })),
    })),
  })),
  insertInto: vi.fn(),
} as unknown as Kysely<Database>;

const createCaller = (ctx: any) => dashboardRouter.createCaller(ctx);

describe('dashboardRouter', () => {
  describe('getReadinessView', () => {
    it('should return composed readiness data for authenticated user', async () => {
      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.getReadinessView({
        date: '2026-02-21',
        history_days: 28,
      });

      expect(result).toBeDefined();
      expect(result.acwr).toBeDefined();
      expect(result.wellnessHistory).toBeDefined();
    });

    it('should throw UNAUTHORIZED for unauthenticated user', async () => {
      const ctx = {
        session: null,
        tenantId: null,
        userId: null,
        db: mockDb,
      };

      const caller = createCaller(ctx);

      await expect(caller.getReadinessView({
        date: '2026-02-21',
        history_days: 28,
      })).rejects.toThrow('You must be logged in');
    });
  });
});
```

**Step 6: Run tests**

Run: `npm run test tests/fate/dashboardRouter.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/fate/ src/trpc/appRouter.ts tests/fate/
git commit -m "feat: add Fate integration with ReadinessView and dashboard router"
```

---

## Task 3: Install and Configure Tailwind CSS v4 ✅ COMPLETE

**Commit:** `f87d4c8`

**Files:**
- Modify: `package.json`
- Create: `src/app/styles/globals.css`
- Modify: `src/app/document.tsx`
- Create/Modify: `vite.config.ts` (if needed)
- Create: `components.json`

**Step 1: Install Tailwind CSS v4**

Run: `pnpm add tailwindcss @tailwindcss/vite`
Expected: Packages installed successfully

**Step 2: Create Tailwind CSS file**

```css
/* src/app/styles/globals.css */
@import "tailwindcss";
```

**Step 3: Update Vite config for Tailwind**

```typescript
// vite.config.ts - add tailwind plugin
import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    cloudflare(),
    tailwindcss(),
  ],
});
```

**Step 4: Update document.tsx to include CSS**

```typescript
// src/app/document.tsx
export const Document: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Training Manager</title>
      <link rel="modulepreload" href="/src/client.tsx" />
      <link rel="stylesheet" href="/src/app/styles/globals.css" />
    </head>
    <body>
      {children}
      <script>import("/src/client.tsx")</script>
    </body>
  </html>
);
```

**Step 5: Verify app runs without CSS errors**

Run: `npm run dev`
Expected: App starts without errors

**Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts src/app/styles/globals.css src/app/document.tsx
git commit -m "feat: configure Tailwind CSS v4"
```

---

## Task 4: Initialize shadcn/ui ✅ COMPLETE

**Commit:** `fe87cdf`

**Files:**
- Create: `components.json`
- Create: `src/app/lib/utils.ts`
- Create: `src/app/components/ui/` (multiple files after CLI init)

**Step 1: Install shadcn dependencies**

Run: `pnpm add class-variance-authority clsx tailwind-merge lucide-react`
Expected: Packages installed

**Step 2: Create components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/app/components",
    "utils": "@/app/lib/utils",
    "ui": "@/app/components/ui",
    "lib": "@/app/lib",
    "hooks": "@/app/hooks"
  },
  "iconLibrary": "lucide"
}
```

**Step 3: Create utils file**

```typescript
// src/app/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Step 4: Add path alias to vite/tsconfig**

Update `tsconfig.json` to add path alias:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Step 5: Install shadcn components via CLI**

Run: `npx shadcn@latest add button input select card form toast -y`
Expected: Components created in `src/app/components/ui/`

**Step 6: Add chart component (for Recharts)**

Run: `npx shadcn@latest add chart -y`
Expected: Chart component with Recharts installed

**Step 7: Verify components exist**

Run: `ls src/app/components/ui/`
Expected: `button.tsx`, `input.tsx`, `select.tsx`, `card.tsx`, `form.tsx`, `toast.tsx`, `chart.tsx`

**Step 8: Verify app runs**

Run: `npm run dev`
Expected: App starts without errors

**Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml components.json tsconfig.json src/app/lib/utils.ts src/app/components/
git commit -m "feat: initialize shadcn/ui with required components"
```

---

## Task 5: Build LogWellnessForm Component ✅ COMPLETE

**Commit:** `85519e8`

**Files:**
- Create: `src/app/components/forms/LogWellnessForm.tsx`
- Create: `src/app/components/forms/schemas.ts`
- Create: `tests/app/components/forms/LogWellnessForm.test.tsx`

**Step 1: Create form schemas**

```typescript
// src/app/components/forms/schemas.ts
import { z } from 'zod';

export const logWellnessSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  rhr: z.number().int().min(30).max(200),
  hrv_rmssd: z.number().min(0).max(200),
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

**Step 2: Create LogWellnessForm component**

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
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

export function LogWellnessForm({ onSubmit, defaultDate }: LogWellnessFormProps) {
  const form = useForm<LogWellnessInput>({
    resolver: zodResolver(logWellnessSchema),
    defaultValues: {
      date: defaultDate || new Date().toISOString().split('T')[0],
      rhr: 60,
      hrv_rmssd: 40,
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>The date of this measurement</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rhr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resting Heart Rate (bpm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormDescription>Your resting heart rate in beats per minute</FormDescription>
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
                  <FormDescription>Heart rate variability in milliseconds</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Wellness'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Install react-hook-form dependencies**

Run: `pnpm add react-hook-form @hookform/resolvers`
Expected: Packages installed

**Step 4: Verify app compiles**

Run: `npm run check`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/app/components/forms/
git commit -m "feat: add LogWellnessForm component with Zod validation"
```

---

## Task 6: Build LogWorkoutForm Component ✅ COMPLETE

**Commit:** `f8b7f14`

**Files:**
- Create: `src/app/components/forms/LogWorkoutForm.tsx`
- Create: `tests/app/components/forms/LogWorkoutForm.test.tsx`

**Step 1: Create LogWorkoutForm component**

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
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
import { logWorkoutSchema, type LogWorkoutInput } from './schemas';

interface LogWorkoutFormProps {
  onSubmit: (data: LogWorkoutInput) => Promise<void>;
  defaultDate?: string;
}

const modalities = [
  { value: 'strength', label: 'Strength Training' },
  { value: 'rowing', label: 'Rowing' },
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'other', label: 'Other' },
] as const;

export function LogWorkoutForm({ onSubmit, defaultDate }: LogWorkoutFormProps) {
  const form = useForm<LogWorkoutInput>({
    resolver: zodResolver(logWorkoutSchema),
    defaultValues: {
      date: defaultDate || new Date().toISOString().split('T')[0],
      modality: 'strength',
      duration_minutes: 60,
      srpe: 5,
    },
  });

  const handleSubmit = async (data: LogWorkoutInput) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Workout</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
            <FormField
              control={form.control}
              name="modality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select activity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {modalities.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
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
              name="srpe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>sRPE (1-10)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormDescription>Session Rating of Perceived Exertion</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Workout'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify app compiles**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/app/components/forms/LogWorkoutForm.tsx
git commit -m "feat: add LogWorkoutForm component with modality selection"
```

---

## Task 7: Build ACWRChart Component ✅ COMPLETE

**Commit:** `c43ca39`

**Files:**
- Create: `src/app/components/charts/ACWRChart.tsx`
- Create: `src/app/components/charts/index.ts`

**Step 1: Create ACWRChart component**

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/app/components/ui/chart';
import { Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';

interface ACWRChartProps {
  data: {
    date: string;
    ratio: number;
    acute_load: number;
    chronic_load: number;
  }[];
}

const chartConfig = {
  ratio: {
    label: 'ACWR',
    color: 'hsl(var(--chart-1))',
  },
  danger: {
    label: 'Danger Zone',
    color: 'hsl(var(--destructive))',
  },
} satisfies ChartConfig;

export function ACWRChart({ data }: ACWRChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acute:Chronic Workload Ratio</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <XAxis
              dataKey="date"
              tickFormatter={(value) => value.slice(5)}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 2.5]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine
              y={1.5}
              stroke="hsl(var(--destructive))"
              strokeDasharray="5 5"
              label={{ value: 'Danger', position: 'right', fill: 'hsl(var(--destructive))' }}
            />
            <Line
              type="monotone"
              dataKey="ratio"
              stroke="var(--color-ratio)"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create charts index**

```typescript
// src/app/components/charts/index.ts
export { ACWRChart } from './ACWRChart';
```

**Step 3: Commit**

```bash
git add src/app/components/charts/
git commit -m "feat: add ACWRChart with 1.5 danger reference line"
```

---

## Task 8: Build FatigueChart Component ✅ COMPLETE

**Commit:** `ebd3254`

**Files:**
- Create: `src/app/components/charts/FatigueChart.tsx`
- Modify: `src/app/components/charts/index.ts`

**Step 1: Create FatigueChart component**

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/app/components/ui/chart';
import { Line, LineChart, XAxis, YAxis } from 'recharts';

interface FatigueChartProps {
  data: {
    date: string;
    rhr: number;
    hrv_rmssd: number;
  }[];
}

const chartConfig = {
  rhr: {
    label: 'RHR (bpm)',
    color: 'hsl(var(--chart-1))',
  },
  hrv_rmssd: {
    label: 'HRV (ms)',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function FatigueChart({ data }: FatigueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fatigue Indicators</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <XAxis
              dataKey="date"
              tickFormatter={(value) => value.slice(5)}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="rhr"
              stroke="var(--color-rhr)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="hrv_rmssd"
              stroke="var(--color-hrv_rmssd)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Update charts index**

```typescript
// src/app/components/charts/index.ts
export { ACWRChart } from './ACWRChart';
export { FatigueChart } from './FatigueChart';
```

**Step 3: Commit**

```bash
git add src/app/components/charts/
git commit -m "feat: add FatigueChart with dual-axis HRV/RHR display"
```

---

## Task 9: Build ReadinessDashboard Page ✅ COMPLETE

**Commit:** `72c08ad`

**Files:**
- Create: `src/app/pages/dashboard.tsx`
- Modify: `src/app/shared/links.ts` (add route)
- Create: `src/app/hooks/useReadinessData.ts`

**Step 1: Create data fetching hook (mock for now, will use Fate client)**

```typescript
// src/app/hooks/useReadinessData.ts
'use client';

import { useState, useEffect } from 'react';

interface ACWRData {
  acute_load: number;
  chronic_load: number;
  ratio: number;
  isDanger: boolean;
}

interface WellnessMetric {
  id: string;
  date: string;
  rhr: number;
  hrv_rmssd: number;
}

interface ReadinessData {
  acwr: ACWRData;
  wellnessHistory: WellnessMetric[];
}

export function useReadinessData(date: string) {
  const [data, setData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/trpc/dashboard.getReadinessView?input=${encodeURIComponent(JSON.stringify({ date, history_days: 28 }))}`);
        const result = await response.json();
        setData(result.result.data);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch'));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [date]);

  return { data, loading, error };
}
```

**Step 2: Create dashboard page**

```tsx
// src/app/pages/dashboard.tsx
'use client';

import { useState } from 'react';
import { LogWellnessForm, LogWorkoutForm } from '@/app/components/forms';
import { ACWRChart, FatigueChart } from '@/app/components/charts';
import { useReadinessData } from '@/app/hooks/useReadinessData';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { toast } from '@/app/hooks/use-toast';

async function submitWellness(data: { date: string; rhr: number; hrv_rmssd: number }) {
  const response = await fetch('/api/trpc/wellness.logDailyMetrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save wellness data');
  return response.json();
}

async function submitWorkout(data: { date: string; modality: string; duration_minutes: number; srpe: number }) {
  const response = await fetch('/api/trpc/training.logSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save workout data');
  return response.json();
}

export function Dashboard() {
  const today = new Date().toISOString().split('T')[0];
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useReadinessData(today);

  const handleWellnessSubmit = async (formData: Parameters<typeof submitWellness>[0]) => {
    try {
      await submitWellness(formData);
      toast({ title: 'Success', description: 'Wellness data saved' });
      setRefreshKey((k) => k + 1);
    } catch {
      toast({ title: 'Error', description: 'Failed to save wellness data', variant: 'destructive' });
    }
  };

  const handleWorkoutSubmit = async (formData: Parameters<typeof submitWorkout>[0]) => {
    try {
      await submitWorkout(formData);
      toast({ title: 'Success', description: 'Workout data saved' });
      setRefreshKey((k) => k + 1);
    } catch {
      toast({ title: 'Error', description: 'Failed to save workout data', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Error loading dashboard: {error.message}</p>
      </div>
    );
  }

  const chartData = data?.wellnessHistory.map((w) => ({
    date: w.date,
    ratio: data.acwr?.ratio || 0,
    acute_load: data.acwr?.acute_load || 0,
    chronic_load: data.acwr?.chronic_load || 0,
    rhr: w.rhr,
    hrv_rmssd: w.hrv_rmssd,
  })) || [];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Readiness Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ACWRChart data={chartData} key={`acwr-${refreshKey}`} />
        <FatigueChart data={chartData} key={`fatigue-${refreshKey}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LogWellnessForm onSubmit={handleWellnessSubmit} defaultDate={today} />
        <LogWorkoutForm onSubmit={handleWorkoutSubmit} defaultDate={today} />
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

**Step 3: Create toast hook**

```typescript
// src/app/hooks/use-toast.ts
'use client';

import * as React from 'react';

const TOAST_LIMIT = 1;
const TOAST_DURATION = 5000;

type ToastVariant = 'default' | 'destructive';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (props: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((props: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-TOAST_LIMIT + 1), { ...props, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export { toast } from './use-toast';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`p-4 rounded-lg shadow-lg border cursor-pointer ${
            t.variant === 'destructive'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-background'
          }`}
          onClick={() => dismiss(t.id)}
        >
          <p className="font-semibold">{t.title}</p>
          {t.description && <p className="text-sm opacity-90">{t.description}</p>}
        </div>
      ))}
    </div>
  );
}
```

**Step 4: Update document to include Toaster**

```tsx
// src/app/document.tsx
import { Toaster } from '@/app/hooks/use-toast';

export const Document: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Training Manager</title>
      <link rel="modulepreload" href="/src/client.tsx" />
      <link rel="stylesheet" href="/src/app/styles/globals.css" />
    </head>
    <body>
      {children}
      <Toaster />
      <script>import("/src/client.tsx")</script>
    </body>
  </html>
);
```

**Step 5: Update routes**

```typescript
// src/app/shared/links.ts - add dashboard route
import { Dashboard } from '../pages/dashboard';

export const routes = [
  { path: '/', component: Dashboard },
];
```

**Step 6: Verify app runs**

Run: `npm run dev`
Expected: Dashboard page loads

**Step 7: Commit**

```bash
git add src/app/pages/dashboard.tsx src/app/hooks/ src/app/document.tsx src/app/shared/links.ts
git commit -m "feat: build ReadinessDashboard page with forms and charts"
```

---

## Task 10: Integration Testing & Verification ✅ COMPLETE

**Results:** 37 tests pass, TypeScript compiles, production build succeeds

**Files:**
- Modify: `tests/integration/` (create integration tests)

**Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests PASS

**Step 2: Run type check**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Build production bundle**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Manual verification**

Run: `npm run dev`
Verify:
- [ ] Dashboard page loads at `/`
- [ ] LogWellnessForm renders with date, RHR, HRV fields
- [ ] LogWorkoutForm renders with date, modality, duration, sRPE fields
- [ ] ACWRChart renders with 1.5 danger line
- [ ] FatigueChart renders with dual axes
- [ ] Form submission triggers toast notification
- [ ] Data refreshes after form submission

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Fate UI implementation with Readiness Dashboard"
```

---

## Verification Checklist

After completing all tasks:

- [x] Fate packages installed (`@nkzw/fate`, `react-fate`)
- [x] Tailwind CSS v4 configured and working
- [x] shadcn/ui initialized with correct aliases (`@/app/...`)
- [x] `LogWellnessForm` component with Zod validation
- [x] `LogWorkoutForm` component with modality select
- [x] `ACWRChart` with 1.5 danger reference line
- [x] `FatigueChart` with dual-axis HRV/RHR display
- [x] `ReadinessDashboard` fetches data via single tRPC query
- [x] All components have `'use client'` directive
- [x] All tests pass (37/37)
- [x] TypeScript compiles without errors
- [x] Production build succeeds

**Known Issues:**
- Bundle size warning: 602KB (exceeds 500KB limit) - consider code-splitting for production optimization
- **Fate resolution bypassed** - `resolve()` was only returning `id` fields, temporarily returning raw data. See `findings.md` for details.

---

## Technical Debt

### Fate Data View Resolution (HIGH PRIORITY)
**Status:** Bypassed - needs investigation
**File:** `src/fate/dashboardRouter.ts`

The `createResolver().resolve()` call was masking data. Views defined all fields:
```typescript
const WellnessMetricView = dataView<WellnessMetric>('WellnessMetric')({
  id: true,
  date: true,
  rhr: true,
  hrv_rmssd: true,
  hrv_ratio: true,
});
```

But only `id` was returned in the response. Temporarily bypassed by returning data directly.

**Next steps:**
1. Check @nkzw/fate documentation for correct `select` usage
2. Verify `list()` wrapper behavior
3. Add unit tests for Fate resolution
4. Re-enable once fixed

### shadcn Theme Setup
**Status:** Manually fixed
**File:** `src/app/styles/globals.css`

shadcn CLI didn't populate the `@theme` block required by Tailwind v4. Manually added all color variables. May need to investigate shadcn + Tailwind v4 compatibility.

### Historical ACWR Calculation
**Status:** Not implemented

ACWR chart shows flat line. To show historical trend, need to calculate ACWR for each day in the history range, not just current day.
