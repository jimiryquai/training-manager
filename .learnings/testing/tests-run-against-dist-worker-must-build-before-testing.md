---
module: testing
problem_type: workflow_gotcha
tags: ["vitest","build","cloudflare-workers","dist"]
---
### [2026-04-03] Tests run against dist/worker/ — must build before testing
## Problem

Tests in this project run against `dist/worker/` (built output), not `src/` (source code). After editing source files, tests will continue to use stale built code until `npm run build` is run.

## Discovery

During Phase 6 implementation, tests were failing after security fixes were applied. Investigation showed:
1. Source code had correct security fix
2. Tests still exhibited old (vulnerable) behavior
3. `dist/worker/index.js` had a modification timestamp 1.5 hours old

The vitest config uses:
```typescript
poolOptions: {
  workers: {
    wrangler: {
      configPath: "./dist/worker/wrangler.json",
    },
  },
},
```

This means tests load code from `dist/worker/`, not `src/`.

## Solution

Always run `npm run build` before `npx vitest run` when source files have changed.

## TDM Implication

When dispatching engineers/testers, include "npm run build before running tests" in task instructions.
