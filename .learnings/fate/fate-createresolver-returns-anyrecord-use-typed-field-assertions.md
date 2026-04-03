---
module: fate
problem_type: best_practice
tags: ["fate","type-safety","createResolver","as-any"]
---
### [2026-04-03] Fate createResolver returns AnyRecord — use typed field assertions
## Problem
`createResolver({view, ctx, select}).resolve(item)` returns `Promise<AnyRecord>`. Accessing nested fields like `.acwrHistory` requires type narrowing, often done via `as any`.

## Solution
Export `ConnectionResult<T>` from `fate/utils.ts` and cast individual fields with proper types:
```ts
const resolvedData = resolved as Record<string, unknown>;
unwrapConnection(resolvedData.acwrHistory as ConnectionResult<ACWRHistoryPoint>)
```

This eliminates `as any` while acknowledging that Fate's resolver is intentionally untyped at the boundary.
