---
module: cloudflare_agents
problem_type: best_practice
tags: ["websocket", "hibernation", "durable_objects"]
---
### [2026-03-21] Cloudflare Agents WebSocket Hibernation Pattern
When implementing Cloudflare Agents with WebSocket hibernation:

1. **Class Extension**: Extend `Agent` from the `agents` package, which internally extends `Server` from `partyserver` and `DurableObject`.

2. **Hibernation Configuration**:
   ```typescript
   static options = { hibernate: true };
   ```
   This enables efficient connection handling where the agent hibernates when idle and wakes on new messages.

3. **State Management (Dual-Layer)**:
   - **Domain Data**: Use Kysely services with D1 database for persistent user data
   - **Agent State**: Use `this.setState()` and `this.state` for coaching persona and session context
   - **Conversation History**: Use `this.sql` template literal for internal SQLite storage

4. **Lifecycle Hooks**:
   - `onStart()`: Called when agent starts (first connection or after hibernation)
   - `onConnect(connection, ctx)`: Called for new WebSocket connections
   - `onMessage(connection, message)`: Main message handling loop
   - `onClose(connection, code, reason, wasClean)`: Connection cleanup
   - `onError(connectionOrError, error?)`: Error handling (handles both connection and non-connection errors)

5. **Wrangler Configuration**:
   ```json
   {
     "durable_objects": {
       "bindings": [{ "name": "COACH_AGENT_DO", "class_name": "CoachAgent" }]
     },
     "migrations": [
       { "tag": "v2", "new_sqlite_classes": ["CoachAgent"] }
     ]
   }
   ```

6. **Routing**: Use `routeAgentRequest(request, env)` from `agents` package to handle `/agents/:agent/:name` WebSocket upgrades.

7. **Type Safety**: For Durable Object namespace types, use `DurableObjectNamespace` without generics to avoid `DurableObjectBranded` constraint issues.
