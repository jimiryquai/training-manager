# Vitest Pool Workers Environment Setup in Worktrees

## Context
When using `@cloudflare/vitest-pool-workers`, the test environment simulates a real Cloudflare Worker. This requires full access to all bindings and secrets defined in the application's runtime.

## The Problem
Inside Git worktrees, environment-specific files like `.dev.vars` (which contain `SESSION_SECRET` or `AI_API_KEY`) are typically not tracked and thus are missing from the worktree root.
When running integration tests that load the worker (e.g., via `rwsdk`'s `defineApp` or `defineDurableSession`), the pool runner attempts to initialize the application and crashes with:
`Error: No secret key provided for session store`

## The Solution (TO-BE)
1. **Sync `.dev.vars`**: Always copy the `.dev.vars` file from the main repository to the worktree root before running tests.
2. **Standard Bindings**: If specific secrets aren't in `.dev.vars`, use the `poolOptions.workers.bindings` section in `vitest.config.ts` to provide dummy values for the CI/test runtime.
3. **Build Requirement**: Ensure `npm run build` is executed within the worktree to populate `dist/worker/wrangler.json`, which many `vitest.config.ts` files reference for configuration.

## Preventions & Best Practices
- Add a check to the test setup to verify required environment variables are present.
- Use a `.dev.vars.example` file to document all mandatory secrets.
- In worktree automation scripts, automate the copying of relevant environment files.
- Favor `vitest-pool-workers` over mocks to ensure high-fidelity integration testing. (Real > Fake > Mock).
