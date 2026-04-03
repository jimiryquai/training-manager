---
module: cloudflare_agents
problem_type: best_practice
tags: ["websocket","session","security","testing"]
---
### [2026-04-03] WebSocket Session Validation Test Pattern
### [2026-04-03] Testing WebSocket Session Validation for CoachAgent

When testing WebSocket session validation in Cloudflare Agents:

1. **Unit Test Utilities in test-utils.ts**: Add session signing/validation utilities that mirror the agent implementation:
   - `test_signSessionId(sessionId, secretKey)` - HMAC-SHA256 signing
   - `test_packSessionId(sessionId, signature)` - Base64 packing
   - `test_createSignedSessionCookie(sessionId, secretKey)` - Full cookie creation
   - `test_validateSignedSession(packed, secretKey)` - Validation logic
   - `test_extractSessionId(cookieHeader)` - Cookie parsing

2. **Unit Tests via vitestInvoke**: Test the cryptographic operations:
   - Signature determinism and uniqueness
   - Correct rejection of invalid/tampered sessions
   - Cookie header parsing edge cases

3. **Integration Tests Require Dev Server**: WebSocket connections can't be tested via vitestInvoke directly. Use `INTEGRATION_TEST=true` with a running dev server.

4. **Security Test Cases**:
   - Valid session → connection accepted
   - Missing/invalid session → code 1008 rejection
   - Query param spoofing ignored (userId from session only)
   - Tampered signature → rejection

5. **Key Implementation Pattern** (CoachAgent):
   ```typescript
   async onConnect(connection, ctx) {
     const session = await this.validateSession(ctx.request);
     if (!session) {
       connection.close(1008, 'Unauthorized');
       return;
     }
     // Use session.userId/session.tenantId, NOT query params
   }
   ```
