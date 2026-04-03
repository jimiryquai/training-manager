---
title: Extract CoachAgent Tool Handlers (Phase 5 Refactor)
type: refactor
status: pending
date: 2026-04-03
origin: docs/ideation/2026-04-03-cleanup-sweep-ideation.md
depends_on: docs/plans/2026-04-03-001-fix-multi-tenancy-error-handling-plan.md
---

# Extract CoachAgent Tool Handlers

## Overview

**Problem:** `CoachAgent.ts` (704 lines) is a God Object handling 7+ distinct concerns: WebSocket lifecycle, DB initialization, session validation, AI/OpenAI integration, 10 inline tool handlers with business logic, conversation history management, persona management, state persistence, and scheduling. The tool handlers contain a 130-line `handleToolCall` method with a large switch statement. Two tools (`getBenchmarks`, `updateBenchmark`) contain **inline SQL** that bypasses the existing service layer entirely. This makes the agent impossible to unit test and creates tight coupling between AI orchestration and data persistence.

**Solution:** Extract the 10 tool handlers into focused, typed modules under `src/agent/tools/`. Each tool delegates to the existing service layer — no inline SQL. The CoachAgent retains only orchestration concerns (lifecycle, WebSocket, AI chat, routing).

**Impact:** MEDIUM-HIGH — Dramatically improves testability, maintainability, and enables parallel development on agent features. Eliminates inline SQL that bypasses error handling wrappers.

**Prerequisites:** Phases 1–4 complete. Service layer is clean and all services use `wrapDatabaseError()`.

---

## Proposed Solution

### Architecture

```
src/agent/
├── CoachAgent.ts          # Orchestration only (lifecycle, WS, AI chat, routing)
├── index.ts               # Module exports
└── tools/
    ├── types.ts           # Shared ToolContext, ToolHandler, ToolResult types
    ├── registry.ts        # Tool name → handler lookup map
    ├── wellnessTools.ts   # logWellness, getWellness
    ├── workoutTools.ts    # logWorkout, getWorkoutHistory
    ├── acwrTools.ts       # getACWR, getACWRTrend
    ├── planTools.ts       # getTrainingPlan, getTodaysSession
    └── benchmarkTools.ts  # getBenchmarks, updateBenchmark
```

### Part A: Shared Tool Infrastructure (`types.ts`)

Every tool handler receives the same context and returns a standardised result. This enables the registry pattern and makes each tool independently testable.

```typescript
// src/agent/tools/types.ts

import type { Kysely } from 'kysely';
import type { Database } from '../../db/schema';
import type { CoachAgentState } from '../CoachAgent';

/**
 * Context provided to every tool handler.
 * Contains everything a tool needs to execute — no agent internals exposed.
 */
export interface ToolContext {
  db: Kysely<Database>;
  userId: string;
  tenantId: string;
  agentState: Readonly<CoachAgentState>;
}

/**
 * Raw params from the WebSocket message.
 * Each tool handler validates and extracts what it needs.
 */
export type ToolParams = Record<string, unknown>;

/**
 * Result of a tool execution.
 * Success carries the data; error carries a user-facing message.
 */
export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

/**
 * A tool handler function.
 * Pure function — takes context + params, returns a result.
 * No side effects on WebSocket connections or agent state.
 */
export type ToolHandler = (
  ctx: ToolContext,
  params: ToolParams
) => Promise<ToolResult>;
```

### Part B: Tool Handler Modules

Each file follows the same pattern:
1. Import specific service functions (no barrel imports)
2. Export one `ToolHandler` per tool
3. Validate params inline (lightweight — services do full validation)
4. Delegate to service layer
5. Return `ToolResult`

#### 1. `wellnessTools.ts` — 2 handlers

| Tool | Service Function | Notes |
|------|-----------------|-------|
| `logWellness` | `createDailyWellnessViaAgent` from `dailyWellness.service` | Agent-specific variant auto-sets `data_source: 'agent_voice'` |
| `getWellness` | `getDailyWellnessByDate` or `getDailyWellnessByDateRange` from `dailyWellness.service` | Branches on `start_date` presence |

```typescript
// src/agent/tools/wellnessTools.ts

import type { ToolHandler, ToolContext, ToolParams, ToolResult } from './types';
import {
  createDailyWellnessViaAgent,
  getDailyWellnessByDate,
  getDailyWellnessByDateRange,
} from '../../services/dailyWellness.service';

export const logWellness: ToolHandler = async (ctx, params) => {
  const result = await createDailyWellnessViaAgent(ctx.db, {
    tenant_id: ctx.tenantId,
    user_id: ctx.userId,
    date: params.date as string,
    rhr: params.rhr as number,
    hrv_rmssd: params.hrv_rmssd as number,
    sleep_score: params.sleep_score as number | undefined,
    fatigue_score: params.fatigue_score as number | undefined,
    mood_score: params.mood_score as number | undefined,
    muscle_soreness_score: params.muscle_soreness_score as number | undefined,
    stress_score: params.stress_score as number | undefined,
    diet_score: params.diet_score as number | undefined,
  });
  return { ok: true, data: result };
};

export const getWellness: ToolHandler = async (ctx, params) => {
  if (params.start_date && params.end_date) {
    const result = await getDailyWellnessByDateRange(ctx.db, {
      tenant_id: ctx.tenantId,
      user_id: ctx.userId,
      start_date: params.start_date as string,
      end_date: params.end_date as string,
    });
    return { ok: true, data: result };
  }
  const result = await getDailyWellnessByDate(ctx.db, {
    tenant_id: ctx.tenantId,
    user_id: ctx.userId,
    date: (params.date as string) || new Date().toISOString().split('T')[0],
  });
  return { ok: true, data: result };
};
```

#### 2. `workoutTools.ts` — 2 handlers

| Tool | Service Function | Notes |
|------|-----------------|-------|
| `logWorkout` | `createWorkoutSessionViaAgent` from `workoutSession.service` | Agent-specific variant auto-sets `is_voice_entry: 1` |
| `getWorkoutHistory` | `getWorkoutSessionsByDateRange` from `workoutSession.service` | Straight delegation |

#### 3. `acwrTools.ts` — 2 handlers

| Tool | Service Function | Notes |
|------|-----------------|-------|
| `getACWR` | `calculateACWR` from `acwr.service` | Defaults date to today |
| `getACWRTrend` | `calculateHistoricalACWR` from `acwr.service` | Requires start/end dates |

#### 4. `planTools.ts` — 2 handlers

| Tool | Service Function | Notes |
|------|-----------------|-------|
| `getTrainingPlan` | `getFullTrainingPlan` or `getTrainingPlansForTenant` from `trainingPlan.service` | Branches on `plan_id` presence |
| `getTodaysSession` | `getTrainingSessionsByPlan` from `trainingSession.service` | Uses `agentState.sessionContext.currentPlanId`; filters by day of week |

#### 5. `benchmarkTools.ts` — 2 handlers (**includes bug fix**)

| Tool | Service Function | Notes |
|------|-----------------|-------|
| `getBenchmarks` | `getUserBenchmarks` from `exerciseDictionary.service` | **Currently inline SQL** → replace with service call |
| `updateBenchmark` | `upsertUserBenchmark` from `exerciseDictionary.service` | **Currently inline SQL with TOCTOU** → replace with service call |

**Bug fix:** The current `updateBenchmark` tool does a read-then-write upsert inline, which is the exact TOCTOU pattern Phase 1 eliminated from services. The existing `upsertUserBenchmark()` in `exerciseDictionary.service.ts` (line 282) handles this correctly. Switching to it fixes the race condition.

### Part C: Tool Registry (`registry.ts`)

A simple map from tool name → handler function. The CoachAgent's `handleToolCall` becomes a lookup + invoke.

```typescript
// src/agent/tools/registry.ts

import type { ToolHandler } from './types';
import { logWellness, getWellness } from './wellnessTools';
import { logWorkout, getWorkoutHistory } from './workoutTools';
import { getACWR, getACWRTrend } from './acwrTools';
import { getTrainingPlan, getTodaysSession } from './planTools';
import { getBenchmarks, updateBenchmark } from './benchmarkTools';

export const toolRegistry: Record<string, ToolHandler> = {
  logWellness,
  getWellness,
  logWorkout,
  getWorkoutHistory,
  getACWR,
  getACWRTrend,
  getTrainingPlan,
  getTodaysSession,
  getBenchmarks,
  updateBenchmark,
};

export function getToolNames(): string[] {
  return Object.keys(toolRegistry);
}
```

### Part D: CoachAgent.ts Refactor

The `handleToolCall` method shrinks from ~130 lines to ~30 lines:

```typescript
// Inside CoachAgent class — replaces the entire handleToolCall method

import { toolRegistry } from './tools/registry';
import type { ToolContext } from './tools/types';

private async handleToolCall(
  connection: Connection,
  payload: { tool: string; params: Record<string, unknown>; requestId?: string }
): Promise<unknown> {
  const { tool, params, requestId } = payload;
  const { userId, tenantId } = this.state;

  if (!userId || !tenantId) {
    connection.send(JSON.stringify({
      type: 'tool_error',
      requestId,
      error: 'User context not initialized',
    }));
    return undefined;
  }

  const handler = toolRegistry[tool];
  if (!handler) {
    connection.send(JSON.stringify({
      type: 'tool_error',
      requestId,
      error: `Unknown tool: ${tool}`,
    }));
    return undefined;
  }

  try {
    const ctx: ToolContext = {
      db: this.getDb(),
      userId,
      tenantId,
      agentState: this.state,
    };

    const result = await handler(ctx, params);

    if (!result.ok) {
      connection.send(JSON.stringify({
        type: 'tool_error',
        requestId,
        error: result.error,
      }));
      return undefined;
    }

    if (requestId) {
      connection.send(JSON.stringify({
        type: 'tool_result',
        requestId,
        result: result.data,
      }));
    }

    this.sql`
      INSERT INTO conversation_history (role, content)
      VALUES ('system', ${'Tool executed: ' + tool})
    `;

    return result.data;

  } catch (error) {
    console.error(`[CoachAgent] Tool error (${tool}):`, error);
    if (requestId) {
      connection.send(JSON.stringify({
        type: 'tool_error',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
    throw error;
  }
}
```

### Part E: Update `COACH_TOOLS` and `index.ts`

- `COACH_TOOLS` stays in `CoachAgent.ts` (it's a static definition used by `onConnect` to advertise tools).
- `src/agent/index.ts` adds the re-export: `export { toolRegistry } from './tools/registry';`
- The `await import('../services')` dynamic import is removed from `handleToolCall` — each tool file imports its specific services directly at the top level. This eliminates the dynamic import overhead on every tool call.

---

## Technical Considerations

### 1. No Behavioral Changes
This is a pure refactor. Every tool handler produces the exact same output for the same input. The WebSocket message protocol is unchanged. The `tool_result`, `tool_error`, and conversation history logging behavior are preserved.

### 2. Eliminates Dynamic Import
Current code does `const services = await import('../services')` inside `handleToolCall` on **every tool call**. After extraction, each tool file imports only the specific functions it needs at module load time. This:
- Removes the dynamic import overhead per invocation
- Enables tree-shaking in future bundling
- Makes dependencies explicit and static

### 3. Fixes TOCTOU in `updateBenchmark`
The current inline upsert reads, then conditionally inserts or updates — a classic time-of-check-to-time-of-use race. The existing `upsertUserBenchmark()` service function has the same pattern (it was created before Phase 1 hardened upserts). **However**, `exerciseDictionary.service.ts` already wraps in `wrapDatabaseError()`, and the read-then-write is acceptable for single-user benchmark updates (a user won't race themselves). If needed later, the service can be hardened with a D1 batch.

### 4. `getTodaysSession` Accesses `agentState`
The `getTodaysSession` tool reads `agentState.sessionContext.currentPlanId`. This is why `ToolContext` includes `agentState: Readonly<CoachAgentState>` — tools that need plan context can read it. The `Readonly` wrapper prevents tools from mutating agent state.

### 5. Error Handling Flow
- Service functions throw on DB errors (wrapped by `wrapDatabaseError`)
- Tool handlers let errors propagate (the `try/catch` in `handleToolCall` catches them)
- Tool handlers return `{ ok: false, error: string }` for domain-level errors (validation failures, not-found)
- This matches the current behavior where tool errors are caught and sent as `tool_error` messages

### 6. Testing Enabler
After extraction, each tool handler can be integration-tested independently:
```typescript
// Future test pattern (not part of this plan)
import { logWellness } from '../tools/wellnessTools';
const result = await logWellness(
  { db, userId: '...', tenantId: '...', agentState: mockState },
  { date: '2026-04-03', rhr: 60, hrv_rmssd: 45 }
);
expect(result.ok).toBe(true);
```

### 7. No New Dependencies
All tool handlers use existing service functions. No new packages, no new abstractions beyond the lightweight `ToolHandler` type.

---

## Acceptance Criteria

- [ ] `CoachAgent.ts` is under 450 lines (from 704)
- [ ] `handleToolCall` method is under 40 lines (from ~130)
- [ ] All 10 tool handlers are extracted to `src/agent/tools/` modules
- [ ] No inline SQL remains in any tool handler — all delegate to service functions
- [ ] `benchmarkTools.ts` uses `getUserBenchmarks` and `upsertUserBenchmark` from `exerciseDictionary.service`
- [ ] `toolRegistry` maps all 10 tool names to handler functions
- [ ] Dynamic `await import('../services')` is eliminated from the hot path
- [ ] WebSocket message protocol unchanged — `tool_result`, `tool_error`, conversation history logging all work identically
- [ ] `COACH_TOOLS` constant remains in `CoachAgent.ts` for `onConnect` advertisement
- [ ] `src/agent/index.ts` exports `toolRegistry`
- [ ] Existing integration tests continue to pass (no behavioral regression)
- [ ] Each tool file imports only the specific service functions it needs (no barrel imports)

---

## Implementation Units

### Unit 1: Create tool infrastructure
**Files:** `src/agent/tools/types.ts` (new)

- Define `ToolContext`, `ToolParams`, `ToolResult`, `ToolHandler` types
- These are the contract that every tool handler implements

### Unit 2: Extract wellness tools
**Files:** `src/agent/tools/wellnessTools.ts` (new)

- Extract `logWellness` and `getWellness` handlers
- Import `createDailyWellnessViaAgent`, `getDailyWellnessByDate`, `getDailyWellnessByDateRange` from `dailyWellness.service`
- Implement param extraction and service delegation

### Unit 3: Extract workout tools
**Files:** `src/agent/tools/workoutTools.ts` (new)

- Extract `logWorkout` and `getWorkoutHistory` handlers
- Import `createWorkoutSessionViaAgent`, `getWorkoutSessionsByDateRange` from `workoutSession.service`

### Unit 4: Extract ACWR tools
**Files:** `src/agent/tools/acwrTools.ts` (new)

- Extract `getACWR` and `getACWRTrend` handlers
- Import `calculateACWR`, `calculateHistoricalACWR` from `acwr.service`

### Unit 5: Extract plan tools
**Files:** `src/agent/tools/planTools.ts` (new)

- Extract `getTrainingPlan` and `getTodaysSession` handlers
- Import `getFullTrainingPlan`, `getTrainingPlansForTenant` from `trainingPlan.service`
- Import `getTrainingSessionsByPlan` from `trainingSession.service`
- `getTodaysSession` reads `ctx.agentState.sessionContext.currentPlanId`

### Unit 6: Extract benchmark tools (includes bug fix)
**Files:** `src/agent/tools/benchmarkTools.ts` (new)

- Extract `getBenchmarks` and `updateBenchmark` handlers
- **Replace inline SQL** with:
  - `getUserBenchmarks` from `exerciseDictionary.service`
  - `upsertUserBenchmark` from `exerciseDictionary.service`
- This eliminates the TOCTOU race in the current inline upsert

### Unit 7: Create tool registry
**Files:** `src/agent/tools/registry.ts` (new)

- Import all 10 handlers
- Export `toolRegistry: Record<string, ToolHandler>`
- Export `getToolNames(): string[]`

### Unit 8: Refactor CoachAgent.ts
**Files:** `src/agent/CoachAgent.ts` (modify)

- Remove the entire `handleToolCall` switch statement (~130 lines)
- Replace with registry lookup pattern (~30 lines)
- Remove `await import('../services')` dynamic import
- Remove inline `BenchmarkUnit` type usage (now in benchmarkTools)
- Import `toolRegistry` from `./tools/registry`
- Import `ToolContext` type from `./tools/types`
- Keep all other methods unchanged (`onStart`, `onConnect`, `onMessage`, `handleChatMessage`, persona, history, scheduling)

### Unit 9: Update module exports
**Files:** `src/agent/index.ts` (modify)

- Add export: `export { toolRegistry } from './tools/registry';`
- Add export: `export type { ToolContext, ToolHandler, ToolResult } from './tools/types';`

### Unit 10: Verify no regressions
**Files:** None (verification only)

- Run full test suite: `pnpm test`
- Verify all existing tests pass
- Manual verification that tool call WebSocket messages work identically
- Confirm CoachAgent.ts line count is under 450

---

## Self-Review Checklist

- [ ] Do all tool handlers return `ToolResult` (never throw for expected failures)?
- [ ] Does every tool import specific service functions (no `import * as services`)?
- [ ] Is `agentState` accessed as `Readonly` in tools that need it?
- [ ] Are there no console.log calls added to tool files (errors propagate to CoachAgent)?
- [ ] Does `benchmarkTools.ts` use `upsertUserBenchmark` instead of inline SQL?
- [ ] Is the WebSocket protocol (message types, requestId handling) preserved exactly?
- [ ] Can `handleToolCall` be read and understood in under 30 seconds?
- [ ] Are there no circular imports between `src/agent/tools/` and `src/agent/CoachAgent.ts`?
- [ ] Does `getTodaysSession` still correctly derive day of week and filter sessions?
- [ ] Is the dynamic `await import('../services')` completely eliminated?
