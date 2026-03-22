---
module: coach_agent
problem_type: workflow_issue
tags: ["infrastructure", "checklist", "testing"]
---
### [2026-03-21] CoachAgent Infrastructure Verification Checklist
When verifying Cloudflare Agent infrastructure is ready for testing:

1. **TypeScript Compilation:** Run `pnpm exec tsc --noEmit` to verify no type errors
2. **Wrangler Configuration:** Check for:
   - `durable_objects.bindings` with correct class_name
   - `migrations` with `new_sqlite_classes` array
3. **Agent Class Structure:**
   - Extends `Agent<Env, State>` from 'agents' package
   - `static options = { hibernate: true }` for hibernation support
   - Kysely getter for D1 database access
   - All lifecycle hooks implemented (onStart, onConnect, onMessage, onClose, onError)
4. **State Management:**
   - `initialState` property defined
   - `this.setState()` for agent state
   - `this.sql` template literals for internal SQLite
5. **Tool Integration:**
   - Tool definitions exported as const
   - Dynamic service imports to avoid circular dependencies
   - Proper error handling with tool_result/tool_error responses
6. **Documentation:**
   - Create `.agentname-ready-for-testing.md` with test scenarios
   - Document known limitations (e.g., pending AI SDK integration)
   - Specify required tests for Tester agent
