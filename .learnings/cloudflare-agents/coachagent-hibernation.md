---
module: coach_agent
problem_type: best_practice
tags: ["websocket", "hibernation", "state_management"]
---
### [2026-03-21] CoachAgent WebSocket Hibernation Pattern
When implementing a CoachAgent with Cloudflare Agents:

1. **Class Structure**: Extend `Agent<Env, State>` from 'agents' package
2. **Hibernation**: Enable with `static options = { hibernate: true }`
3. **Lifecycle Methods**:
   - `onStart()`: Initialize SQLite tables via `this.sql`
   - `onConnect(connection, ctx)`: Validate auth, set state via `connection.setState()` and `this.setState()`
   - `onMessage(connection, message)`: Route messages by type (tool_call, chat, set_persona, etc.)
   - `onClose()`: Cleanup and prune history
   - `onError(connOrError, error?)`: Handle both connection and generic errors

4. **State Management**:
   - Agent state: `this.setState()` / `this.state` for persona and user context
   - Connection state: `connection.setState()` for per-connection metadata
   - Conversation history: `this.sql` template literals for SQLite storage

5. **Tool Execution**: Switch statement calling Kysely services via dynamic import
   - Use `await import('../services')` to avoid circular dependencies
   - Return results via `connection.send(JSON.stringify(...))`

6. **Wrangler Config**:
   ```json
   "durable_objects": { "bindings": [{ "name": "COACH_AGENT_DO", "class_name": "CoachAgent" }] },
   "migrations": [{ "tag": "v2", "new_sqlite_classes": ["CoachAgent"] }]
   ```

7. **Worker Routing**: Use `routeAgentRequest(request, env)` from 'agents' in middleware for `/agents/:agent/:name` paths
