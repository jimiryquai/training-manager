---
module: cloudflare_agents
problem_type: best_practice
tags: ["websocket","hibernation","security"," "]
---
### [2026-04-03] CoachAgent WebSocket Session Validation

### [2026-04-03] WebSocket Session Validation Pattern for CoachAgent

When implementing a Cloudflare Agent with hibernation:

1. **Critical Fix**: Previously, the `onConnect` method accepted `userId` and `tenantId` from query params/headers without validating against the session. This allows impersonation attacks by anyone who knows the user's `userId` and `tenantId`.

2. **Implementation:**
- Modified `CoachAgentEnv` interface to extend `Cloudflare.Env` (required by Agent class constraint)
- Added `validateSession()` private method to CoachAgent that validates session cookie against `UserSession` DO
- Reject with code 1008 if invalid
- Extract `userId` and `tenantId` from the validated session

3. **Security:** The session validation logic replicates the `rwsdk/auth` pattern:
- Extract session_id from Cookie header
- Validate HMAC-SHA256 signature using `SESSION_SECRET` or `AUTH_SECRET_KEY`
- Look up session in UserSession DO via RPC `getSession()` call
- Return session data only if valid

4. **Pattern:** Keep existing hibernation pattern: `this.ctx.acceptWebSocket(server)`, NOT `ws.accept()`
