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

### Current Issue (UNRESOLVED)
Fate's `resolve()` is masking data - only returning `id` fields instead of all selected fields.

```typescript
// Expected to return all fields defined in view:
const WellnessMetricView = dataView<WellnessMetric>('WellnessMetric')({
  id: true,
  date: true,
  rhr: true,
  hrv_rmssd: true,
  hrv_ratio: true,
});

// But only id was returned in items
```

### Temporary Bypass
Currently returning data directly without Fate resolution:
```typescript
return {
  acwr: acwrData,
  wellnessHistory: wellnessData,
};
```

### Needs Investigation
- Is `select` parameter being passed correctly?
- Is Fate's `list()` wrapper working with our data shape?
- Check @nkzw/fate version and docs

---

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

## Files Modified This Session

| File | Change |
|------|--------|
| `src/worker.tsx` | Added dev-login route, dev session bypass, pass session to tRPC |
| `src/trpc/handler.ts` | Accept optional session parameter |
| `src/scripts/seed.ts` | Created seed script using rwsdk worker-run |
| `package.json` | Updated seed script command |
| `src/app/styles/globals.css` | Added @theme block with shadcn colors |
| `src/app/components/ui/button.tsx` | Added cursor-pointer |
| `src/app/hooks/useReadinessData.ts` | Fixed URL path |
| `src/fate/dashboardRouter.ts` | Bypassed Fate resolve() temporarily |
