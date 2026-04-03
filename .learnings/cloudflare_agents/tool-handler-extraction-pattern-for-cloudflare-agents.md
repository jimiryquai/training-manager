---
module: cloudflare_agents
problem_type: architectural_decision
tags: ["agent","tool-handlers","god-object","refactor","registry-pattern"]
---
### [2026-04-03] Tool Handler Extraction Pattern for Cloudflare Agents
### [2026-04-03] Tool Handler Extraction Pattern for CoachAgent

When an Agent class grows beyond 500 lines with inline tool handlers:

**Problem:** `CoachAgent.ts` (704 lines) contained 10 inline tool handlers with a 130-line `handleToolCall` switch statement. Two tools (`getBenchmarks`, `updateBenchmark`) used **inline SQL** bypassing the service layer's error handling.

**Solution:** Extract to `src/agent/tools/` with registry pattern:

```
src/agent/tools/
├── types.ts           # ToolContext, ToolHandler, ToolResult
├── registry.ts        # Record<string, ToolHandler> lookup map
├── wellnessTools.ts   # 2 handlers
├── workoutTools.ts    # 2 handlers
├── acwrTools.ts       # 2 handlers
├── planTools.ts       # 2 handlers
└── benchmarkTools.ts  # 2 handlers (replaces inline SQL with service calls)
```

**Key Design Decisions:**

1. **ToolContext interface** - Every handler receives `{ db, userId, tenantId, agentState: Readonly<CoachAgentState> }`. This enables `getTodaysSession` to read `agentState.sessionContext.currentPlanId`.

2. **ToolResult union** - Return `{ ok: true; data: unknown } | { ok: false; error: string }`. Errors for validation failures, throws for unexpected DB errors (caught by caller).

3. **Registry pattern** - `handleToolCall` becomes a 30-line lookup:
   ```typescript
   const handler = toolRegistry[tool];
   const result = await handler(ctx, params);
   ```

4. **Eliminate dynamic import** - Replace `await import('../services')` on every call with static imports in each tool file.

5. **Inline SQL → Service calls** - The benchmark tools used raw Kysely queries. Extraction forced use of `getUserBenchmarks()` and `upsertUserBenchmark()`, fixing a TOCTOU race condition.

**Benefits:**
- CoachAgent.ts reduced from 704 → under 450 lines
- Each tool handler becomes independently testable
- No behavioral changes (pure refactor)
- Explicit static dependencies enable tree-shaking

