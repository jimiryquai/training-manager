/**
 * CoachAgent WebSocket Integration Tests
 *
 * Tests WebSocket session validation, connection lifecycle, and security.
 *
 * IMPORTANT: These tests require a running dev server with proper session setup.
 * The new implementation validates session cookies against UserSession DO.
 * Query params for userId/tenantId are NO LONGER trusted.
 *
 * Run with:
 *   pnpm run dev &
 *   INTEGRATION_TEST=true pnpm exec vitest run tests/integration/coachAgent.websocket.test.ts
 *
 * Or use the test:integration script:
 *   pnpm run test:integration
 */

import { describe, it, expect, afterEach, beforeEach, beforeAll } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const DEV_SERVER_URL = 'http://localhost:5173';
const WS_URL = 'ws://localhost:5173';
const TEST_TIMEOUT = 15000;

// Test constants
const TEST_TENANT = 'tenant-ws-session-test';
const TEST_USER = 'user-ws-session-test';
const TEST_SESSION_ID = 'test-session-id-12345';
const TEST_SECRET_KEY = 'test-secret-key-for-session-signing';

// Skip these tests unless integration testing is explicitly enabled
const shouldRun = process.env.INTEGRATION_TEST === 'true';

describe.skipIf(!shouldRun)('CoachAgent WebSocket Session Validation', () => {
  let ws: WebSocket | null = null;
  let validSessionCookie: string = '';

  /**
   * Create a signed session cookie for testing
   */
  async function createTestSessionCookie(sessionId: string, secretKey: string): Promise<string> {
    const signature = await vitestInvoke('test_signSessionId', sessionId, secretKey);
    const packed = await vitestInvoke('test_packSessionId', sessionId, signature);
    return `session_id=${packed}`;
  }

  /**
   * Connect to WebSocket with session cookie
   */
  function connectWithCookie(
    agentName: string,
    sessionCookie: string
  ): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const url = `${WS_URL}/agents/CoachAgent/${agentName}`;
      const socket = new WebSocket(url, {
        headers: {
          Cookie: sessionCookie
        }
      } as WebSocketInit);

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
        socket.close();
      }, TEST_TIMEOUT);

      socket.onopen = () => {
        clearTimeout(timeout);
        resolve(socket);
      };

      socket.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  /**
   * Connect to WebSocket without session cookie (for testing rejection)
   */
  function connectWithoutCookie(agentName: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const url = `${WS_URL}/agents/CoachAgent/${agentName}`;
      const socket = new WebSocket(url);

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
        socket.close();
      }, TEST_TIMEOUT);

      socket.onopen = () => {
        clearTimeout(timeout);
        resolve(socket);
      };

      socket.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  /**
   * Wait for a specific message type from WebSocket
   */
  function waitForMessage(socket: WebSocket, expectedType: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for message type: ${expectedType}`));
      }, TEST_TIMEOUT);

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === expectedType) {
          clearTimeout(timeout);
          resolve(data);
        }
      };

      socket.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  /**
   * Wait for connection close with specific code
   */
  function waitForClose(socket: WebSocket): Promise<{ code: number; reason: string }> {
    return new Promise((resolve) => {
      socket.onclose = (event) => {
        resolve({ code: event.code, reason: event.reason });
      };
    });
  }

  /**
   * Send a message to WebSocket
   */
  function sendMessage(socket: WebSocket, message: object): void {
    socket.send(JSON.stringify(message));
  }

  beforeAll(async () => {
    // Create a valid signed session cookie for tests
    validSessionCookie = await createTestSessionCookie(TEST_SESSION_ID, TEST_SECRET_KEY);
  });

  beforeEach(async () => {
    // Clean database before each test
    await vitestInvoke('test_cleanDatabase', TEST_TENANT);
  });

  afterEach(() => {
    if (ws) {
      ws.close();
      ws = null;
    }
  });

  // ==========================================================================
  // Session Validation Tests (Critical Security Tests)
  // ==========================================================================

  describe('Session Validation Security', () => {
    it('should reject connection without session cookie (code 1008)', async () => {
      const socket = await connectWithoutCookie('test-no-cookie');

      // Should receive error message then close
      const closeEvent = await waitForClose(socket);

      expect(closeEvent.code).toBe(1008);
      expect(closeEvent.reason).toBe('Unauthorized');
    });

    it('should reject connection with invalid session signature (code 1008)', async () => {
      // Create cookie with wrong signature
      const invalidCookie = `session_id=${btoa('session-id:invalid-signature')}`;
      const socket = await connectWithCookie('test-invalid-sig', invalidCookie);

      const closeEvent = await waitForClose(socket);

      expect(closeEvent.code).toBe(1008);
      expect(closeEvent.reason).toBe('Unauthorized');
    });

    it('should reject connection with malformed session cookie (code 1008)', async () => {
      const malformedCookie = 'session_id=not-valid-base64!!!';
      const socket = await connectWithCookie('test-malformed', malformedCookie);

      const closeEvent = await waitForClose(socket);

      expect(closeEvent.code).toBe(1008);
      expect(closeEvent.reason).toBe('Unauthorized');
    });

    it('should reject connection with tampered session ID (code 1008)', async () => {
      // Create valid cookie, then tamper with it
      const validCookie = await createTestSessionCookie(TEST_SESSION_ID, TEST_SECRET_KEY);
      // Extract and modify the packed value
      const packedValue = validCookie.replace('session_id=', '');
      const decoded = atob(packedValue);
      const tamperedDecoded = decoded.replace(TEST_SESSION_ID, 'different-session-id');
      const tamperedCookie = `session_id=${btoa(tamperedDecoded)}`;

      const socket = await connectWithCookie('test-tampered', tamperedCookie);

      const closeEvent = await waitForClose(socket);

      expect(closeEvent.code).toBe(1008);
      expect(closeEvent.reason).toBe('Unauthorized');
    });

    it('should ignore userId/tenantId query params (use session data only)', async () => {
      // Note: This test validates that query params are IGNORED
      // The agent should only use userId/tenantId from the validated session
      // If query params were trusted, this would be a security vulnerability

      // Connect with valid session but spoofed query params
      const url = `${WS_URL}/agents/CoachAgent/test-spoof?userId=attacker-user&tenantId=attacker-tenant`;
      const socket = new WebSocket(url, {
        headers: { Cookie: validSessionCookie }
      } as WebSocketInit);

      // Wait for connected message
      const message = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), TEST_TIMEOUT);
        socket.onmessage = (event) => {
          clearTimeout(timeout);
          resolve(JSON.parse(event.data));
        };
        socket.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      // The state should contain the SESSION's userId/tenantId, NOT the query params
      // Request state to verify
      socket.send(JSON.stringify({ type: 'get_state' }));

      const stateMessage = await waitForMessage(socket, 'state');

      // Query param spoofing should be ignored
      // userId should come from session, not 'attacker-user'
      expect(stateMessage.state.userId).not.toBe('attacker-user');
      expect(stateMessage.state.tenantId).not.toBe('attacker-tenant');

      ws = socket;
    });
  });

  // ==========================================================================
  // Valid Session Connection Tests
  // ==========================================================================

  describe('Valid Session Connection', () => {
    it('should accept connection with valid session cookie', async () => {
      // Note: This requires the dev server to have the test session pre-created
      // or to accept the test secret key for session validation
      const socket = await connectWithCookie('test-valid-session', validSessionCookie);

      // Should receive connected message
      const message = await waitForMessage(socket, 'connected');

      expect(message.type).toBe('connected');
      expect(message.tools).toBeInstanceOf(Array);
      expect(message.tools.length).toBeGreaterThan(0);
      expect(message.tools).toContain('logWellness');
      expect(message.tools).toContain('getACWR');
      expect(message.persona).toBe('supportive');
      expect(message.message).toContain('CoachAgent connected');

      ws = socket;
    });

    it('should send error message before closing for invalid session', async () => {
      const invalidCookie = 'session_id=invalid';
      const socket = await connectWithCookie('test-error-msg', invalidCookie);

      // May receive error message before close
      const messageReceived = await Promise.race([
        new Promise<string>(resolve => {
          socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'error' && data.code === 'UNAUTHORIZED') {
                resolve('error-message');
              }
            } catch {}
          };
        }),
        waitForClose(socket).then(() => 'closed')
      ]);

      // Either we got the error message or direct close - both are valid
      expect(['error-message', 'closed']).toContain(messageReceived);
    });
  });

  // ==========================================================================
  // Message Handling Tests (require valid session)
  // ==========================================================================

  describe('Message Handling', () => {
    it('should handle get_state message', async () => {
      ws = await connectWithCookie('test-state', validSessionCookie);
      await waitForMessage(ws, 'connected');

      sendMessage(ws, { type: 'get_state' });

      const message = await waitForMessage(ws, 'state');
      expect(message.type).toBe('state');
      expect(message.state).toBeDefined();
      expect(message.state.personaMode).toBe('supportive');
    });

    it('should handle set_persona message', async () => {
      ws = await connectWithCookie('test-persona', validSessionCookie);
      await waitForMessage(ws, 'connected');

      sendMessage(ws, { type: 'set_persona', persona: 'analytical' });

      const message = await waitForMessage(ws, 'persona_updated');
      expect(message.type).toBe('persona_updated');
      expect(message.persona).toBe('analytical');

      // Verify persistence
      sendMessage(ws, { type: 'get_state' });
      const stateMessage = await waitForMessage(ws, 'state');
      expect(stateMessage.state.personaMode).toBe('analytical');
    });

    it('should reject invalid persona', async () => {
      ws = await connectWithCookie('test-invalid-persona', validSessionCookie);
      await waitForMessage(ws, 'connected');

      sendMessage(ws, { type: 'set_persona', persona: 'invalid_persona' });

      const message = await waitForMessage(ws, 'error');
      expect(message.type).toBe('error');
      expect(message.code).toBeDefined();
    });

    it('should return error for unknown message type', async () => {
      ws = await connectWithCookie('test-unknown', validSessionCookie);
      await waitForMessage(ws, 'connected');

      sendMessage(ws, { type: 'unknown_type' });

      const message = await waitForMessage(ws, 'error');
      expect(message.type).toBe('error');
      expect(message.code).toBe('UNKNOWN_MESSAGE_TYPE');
    });

    it('should handle malformed JSON', async () => {
      ws = await connectWithCookie('test-malformed', validSessionCookie);
      await waitForMessage(ws, 'connected');

      ws.send('not valid json');

      const message = await waitForMessage(ws, 'error');
      expect(message.type).toBe('error');
      expect(message.code).toBe('PROCESSING_ERROR');
    });
  });

  // ==========================================================================
  // Tool Execution Tests (require valid session)
  // ==========================================================================

  describe('Tool Execution', () => {
    it('should execute getACWR tool and return result', async () => {
      ws = await connectWithCookie('test-tool', validSessionCookie);
      await waitForMessage(ws, 'connected');

      sendMessage(ws, {
        type: 'tool_call',
        tool: 'getACWR',
        params: { date: '2026-03-21' },
        requestId: 'test-1'
      });

      const message = await waitForMessage(ws, 'tool_result');
      expect(message.type).toBe('tool_result');
      expect(message.requestId).toBe('test-1');
      expect(message.result).toBeDefined();
      expect(message.result).toHaveProperty('acute_load');
      expect(message.result).toHaveProperty('chronic_load');
      expect(message.result).toHaveProperty('ratio');
    });

    it('should return tool_error for unknown tool', async () => {
      ws = await connectWithCookie('test-unknown-tool', validSessionCookie);
      await waitForMessage(ws, 'connected');

      sendMessage(ws, {
        type: 'tool_call',
        tool: 'nonExistentTool',
        params: {},
        requestId: 'test-2'
      });

      const message = await waitForMessage(ws, 'tool_error');
      expect(message.type).toBe('tool_error');
      expect(message.requestId).toBe('test-2');
      expect(message.error).toContain('Unknown tool');
    });
  });

  // ==========================================================================
  // State Persistence Tests
  // ==========================================================================

  describe('State Persistence', () => {
    it('should persist state across reconnections', async () => {
      // First connection - set persona
      ws = await connectWithCookie('persist-test', validSessionCookie);
      await waitForMessage(ws, 'connected');

      sendMessage(ws, { type: 'set_persona', persona: 'intense' });
      await waitForMessage(ws, 'persona_updated');

      ws.close();

      // Second connection - same agent name
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for close
      ws = await connectWithCookie('persist-test', validSessionCookie);
      await waitForMessage(ws, 'connected');

      sendMessage(ws, { type: 'get_state' });
      const stateMessage = await waitForMessage(ws, 'state');

      // State should persist
      expect(stateMessage.state.personaMode).toBe('intense');
    });
  });

  // ==========================================================================
  // Hibernation Tests
  // ==========================================================================

  describe('Hibernation', () => {
    it('should preserve state after hibernation wake', async () => {
      ws = await connectWithCookie('hibernation-test', validSessionCookie);
      await waitForMessage(ws, 'connected');

      sendMessage(ws, { type: 'set_persona', persona: 'recovery' });
      await waitForMessage(ws, 'persona_updated');

      // Wait longer than hibernation threshold would be
      // Note: In real hibernation, the connection would be dormant
      // This test simulates the wake behavior
      await new Promise(resolve => setTimeout(resolve, 2000));

      sendMessage(ws, { type: 'get_state' });
      const stateMessage = await waitForMessage(ws, 'state');

      expect(stateMessage.state.personaMode).toBe('recovery');
    });
  });
});

// TypeScript declarations for WebSocket with headers
interface WebSocketInit {
  headers?: Record<string, string>;
}

declare global {
  interface WebSocketConstructor {
    new(url: string, protocols?: string | string[] | WebSocketInit): WebSocket;
  }
}
