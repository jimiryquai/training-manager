---
module: agent
problem_type: refactor_pattern
tags: ["coach-agent","tool-handlers","registry-pattern","extraction"]
---
### [2026-04-03] CoachAgent tool handler extraction pattern
When extracting tool handlers from a God Object agent class into standalone functions:
1. Define a `ToolHandler = (ctx: ToolContext, params: ToolParams) => Promise<unknown>` type — skip the Result monad wrapper. The caller's try/catch already handles errors. Adding `{ ok, data } | { ok, error }` to 10 handlers is unnecessary overhead.
2. `ToolContext` carries `db`, `userId`, `tenantId`, and `Readonly<AgentState>`. The Readonly prevents tools from mutating agent state.
3. A simple `Record<string, ToolHandler>` registry replaces a 130-line switch statement with a ~40-line lookup + invoke.
4. Each tool file imports only its specific service functions (no barrel imports), which eliminates the dynamic `await import('../services')` on every tool call.
5. `benchmarkTools.ts` MUST use `getUserBenchmarks` and `upsertUserBenchmark` from `exerciseDictionary.service` — never inline SQL. The service's upsert still does read-then-write but it's wrapped in `wrapDatabaseError` and acceptable for single-user benchmark updates.
6. `getTodaysSession` accesses `ctx.agentState.sessionContext.currentPlanId` for plan context — that's why ToolContext includes agentState.
