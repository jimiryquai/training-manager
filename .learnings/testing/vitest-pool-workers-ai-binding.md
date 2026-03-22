---
module: testing_framework
problem_type: config_error
tags: ["vitest_pool_workers", "cloudflare", "ai_binding"]
---
### [2026-03-21] Vitest Pool Workers with Cloudflare AI Binding Configuration
When adding Cloudflare Workers AI binding to a project using `@cloudflare/vitest-pool-workers`, you must:

1. **Configure wrangler.jsonc correctly** - The AI binding requires object format, not boolean:
   ```json
   "ai": {
     "binding": "AI",
     "remote": false
   }
   ```
   - `"ai": true` causes build error (expects object)
   - `"ai": {}` causes build error (requires `binding` field)

2. **Disable remote bindings in vitest.config.ts** - The `remoteBindings: false` option prevents wrangler from requiring login during tests:
   ```typescript
   poolOptions: {
     workers: {
       wrangler: { configPath: "./dist/worker/wrangler.json" },
       remoteBindings: false, // Critical: prevents "Failed to fetch auth token" errors
     },
   }
   ```

3. **Without this config, tests fail with**: "You must be logged in to use wrangler dev in remote mode"

4. **Rebuild after wrangler.jsonc changes** - The vitest config references `./dist/worker/wrangler.json`, so you must run `pnpm run build` after changing wrangler.jsonc.

This pattern applies to any Cloudflare binding that requires remote access (AI, R2, KV, etc.) when running tests locally without authentication.
