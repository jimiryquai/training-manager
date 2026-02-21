# Findings: Fate UI Dashboard Implementation

## Session: 2026-02-21

---

## Authentication & Sessions (RedwoodSDK)

### How Sessions Work
- RedwoodSDK uses `defineDurableSession` with a Durable Object
- `sessionStore.load(request)` expects a **signed** cookie in rwsdk's format
- Session cookie contains encrypted session ID pointing to Durable Object

### Dev Login Pattern
For development, we implemented a bypass:
```typescript
// In sessionMiddleware
if (!session && import.meta.env.DEV) {
  const cookies = request.headers.get("cookie") || "";
  const devSession = cookies.match(/dev_session=([^;]+)/)?.[1];
  if (devSession === "seed-user-001:seed-tenant-001") {
    ctx.session = { userId: "seed-user-001", tenantId: "seed-tenant-001" };
  }
}
```

### Key Issue: tRPC Context Isolation
- tRPC handler creates its own context via `sessionStore.load()`
- Middleware's `ctx.session` was NOT passed to tRPC
- **Fix:** Pass session through to handler: `trpcHandler(request, ctx.session)`

---

## Database Seeding (RedwoodSDK)

### Correct Pattern
```typescript
// src/scripts/seed.ts
import { env } from 'cloudflare:workers';

export default async function seed() {
  const db = new Kysely<Database>({
    dialect: new D1Dialect({ database: env.DB }),
  });
  // ... seed logic
}
```

### Run Command
```bash
npm run seed  # Uses: rwsdk worker-run ./src/scripts/seed.ts
```

### D1 SQL Variable Limit
- D1 has a limit on SQL variables per query
- Batch inserts (5 records at a time) to avoid "too many SQL variables" error

---

## shadcn/ui + Tailwind CSS v4

### Theme Configuration Required
Tailwind v4 uses `@theme` block in CSS:
```css
@import "tailwindcss";

@theme {
  --color-primary: hsl(222.2 47.4% 11.2%);
  --color-primary-foreground: hsl(210 40% 98%);
  /* ... all other colors */
}
```

**shadcn should have populated this but didn't** - likely Tailwind v4 compatibility gap.

---

## Fate Data View Resolution

### Original Issue (RESOLVED)
Fate's `resolve()` was masking data - only returning `id` fields instead of all selected fields.

### Root Cause
The `createResolver()` function requires explicit **nested field paths** in the `select` array:
- ❌ Wrong: `['wellnessHistory']` → returns only `id` in each item
- ✅ Right: `['wellnessHistory.id', 'wellnessHistory.date', 'wellnessHistory.rhr', ...]`

### Additional Behavior
List fields are wrapped in GraphQL/Relay-style connection objects:
```json
{
  "items": [{ "cursor": "id", "node": { ...data } }],
  "pagination": { "hasNext": false, "hasPrevious": false }
}
```

### Solution Implemented
1. Created `src/fate/utils.ts` with:
   - `generateSelectPaths(view)` - auto-generates all nested paths from a view definition
   - `unwrapConnection(connection)` - extracts plain arrays from connection objects

2. Updated `src/fate/dashboardRouter.ts`:
   - Uses `generateSelectPaths(ReadinessView)` when no explicit select provided
   - Uses `unwrapConnection()` for backward compatibility with existing client

### Files Modified This Session

## Client-Side Data Fetching

### tRPC Query Format
```typescript
// GET request with JSON input
fetch(`/trpc/dashboard.getReadinessView?input=${encodeURIComponent(JSON.stringify({ date, history_days: 28 }))}`)
```

NOT `/api/trpc/...` - the route is `/trpc/*`

### Response Shape
```json
{
  "result": {
    "data": { ... }
  }
}
```

---

## Chart Data (ACWR Limitation)

### Current Behavior
ACWR chart shows flat line because we calculate ACWR for **current day only**, then apply that single value to all 28 days of history.

### To Fix (Future)
Calculate historical ACWR - each day's ratio based on that day's acute/chronic load.

---

### Files Modified This Session

| File | Change |
|------|--------|
| `src/worker.tsx` | Added dev-login route, dev session bypass, pass session to tRPC |
| `src/trpc/handler.ts` | Accept optional session parameter |
| `src/scripts/seed.ts` | Created seed script using rwsdk worker-run |
| `package.json` | Updated seed script command |
| `src/app/styles/globals.css` | Added @theme block with shadcn colors |
| `src/app/components/ui/button.tsx` | Added cursor-pointer |
| `src/app/hooks/useReadinessData.ts` | Fixed URL path |
| `src/fate/dashboardRouter.ts` | Fixed Fate resolve() with auto-generated select paths |
| `src/fate/views.ts` | Added ACWRHistoryPointView |
| `src/fate/utils.ts` | Created generateSelectPaths() and unwrapConnection() helpers |
| `tests/fate/fate-resolve.test.ts` | Added tests documenting Fate behavior |
| `tests/fate/dashboardRouter.test.ts` | Updated test for new return type |
