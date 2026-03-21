/**
 * CoachAgent WebSocket Integration Tests
 *
 * These tests require a running dev server. Run with:
 *   pnpm run dev &
 *   pnpm exec vitest run tests/integration/coachAgent.websocket.test.ts
 *
 * Or use the test:integration script:
 *   pnpm run test:integration
 */

import { describe, it, expect, afterEach } from 'vitest';

const DEV_SERVER_URL = 'http://localhost:5173';
const WS_URL = 'ws://localhost:5173';
const TEST_TIMEOUT = 10000;

// Skip these tests unless integration testing is explicitly enabled
const shouldRun = process.env.INTEGRATION_TEST === 'true';

describe.skipIf(!shouldRun)('CoachAgent WebSocket Integration', () => {
  let ws: WebSocket | null = null;

  function connect(agentName: string, userId: string, tenantId: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const url = `${WS_URL}/agents/CoachAgent/${agentName}?userId=${userId}&tenantId=${tenantId}`;
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

  function sendMessage(socket: WebSocket, message: object): void {
    socket.send(JSON.stringify(message));
  }

  afterEach(() => {
    if (ws) {
      ws.close();
      ws = null;
    }
  });

  describe('WebSocket Connection Lifecycle', () => {
    it('should connect and receive connected message with tools list', async () => {
      ws = await connect('test-agent', 'test-user', 'test-tenant');

      const message = await waitForMessage(ws, 'connected');

      expect(message.type).toBe('connected');
      expect(message.tools).toBeInstanceOf(Array);
      expect(message.tools.length).toBeGreaterThan(0);
      expect(message.tools).toContain('logWellness');
      expect(message.tools).toContain('getACWR');
      expect(message.persona).toBe('supportive');
      expect(message.message).toContain('CoachAgent connected');
    });

    it('should close connection with 1008 when missing userId', async () => {
      const url = `${WS_URL}/agents/CoachAgent/test-agent?tenantId=test-tenant`;
      const socket = new WebSocket(url);

      await new Promise<void>((resolve) => {
        socket.onclose = (event) => {
          expect(event.code).toBe(1008);
          expect(event.reason).toBe('Unauthorized');
          resolve();
        };
      });
    });

    it('should close connection with 1008 when missing tenantId', async () => {
      const url = `${WS_URL}/agents/CoachAgent/test-agent?userId=test-user`;
      const socket = new WebSocket(url);

      await new Promise<void>((resolve) => {
        socket.onclose = (event) => {
          expect(event.code).toBe(1008);
          expect(event.reason).toBe('Unauthorized');
          resolve();
        };
      });
    });
  });

  describe('Message Handling', () => {
    it('should handle get_state message', async () => {
      ws = await connect('test-state', 'user-1', 'tenant-1');
      await waitForMessage(ws, 'connected');

      sendMessage(ws, { type: 'get_state' });

      const message = await waitForMessage(ws, 'state');
      expect(message.type).toBe('state');
      expect(message.state).toBeDefined();
      expect(message.state.userId).toBe('user-1');
      expect(message.state.tenantId).toBe('tenant-1');
      expect(message.state.personaMode).toBe('supportive');
    });

    it('should handle set_persona message', async () => {
      ws = await connect('test-persona', 'user-1', 'tenant-1');
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
      ws = await connect('test-invalid-persona', 'user-1', 'tenant-1');
      await waitForMessage(ws, 'connected');

      sendMessage(ws, { type: 'set_persona', persona: 'invalid_persona' });

      const message = await waitForMessage(ws, 'error');
      expect(message.type).toBe('error');
      expect(message.code).toBeDefined();
    });

    it('should return error for unknown message type', async () => {
      ws = await connect('test-unknown', 'user-1', 'tenant-1');
      await waitForMessage(ws, 'connected');

      sendMessage(ws, { type: 'unknown_type' });

      const message = await waitForMessage(ws, 'error');
      expect(message.type).toBe('error');
      expect(message.code).toBe('UNKNOWN_MESSAGE_TYPE');
    });

    it('should handle malformed JSON', async () => {
      ws = await connect('test-malformed', 'user-1', 'tenant-1');
      await waitForMessage(ws, 'connected');

      ws.send('not valid json');

      const message = await waitForMessage(ws, 'error');
      expect(message.type).toBe('error');
      expect(message.code).toBe('PROCESSING_ERROR');
    });
  });

  describe('Tool Execution', () => {
    it('should execute getACWR tool and return result', async () => {
      ws = await connect('test-tool', 'user-1', 'tenant-1');
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
      ws = await connect('test-unknown-tool', 'user-1', 'tenant-1');
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

  describe('State Persistence', () => {
    it('should persist state across reconnections', async () => {
      // First connection - set persona
      ws = await connect('persist-test', 'user-1', 'tenant-1');
      await waitForMessage(ws, 'connected');

      sendMessage(ws, { type: 'set_persona', persona: 'intense' });
      await waitForMessage(ws, 'persona_updated');

      ws.close();

      // Second connection - same agent name
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for close
      ws = await connect('persist-test', 'user-1', 'tenant-1');
      await waitForMessage(ws, 'connected');

      sendMessage(ws, { type: 'get_state' });
      const stateMessage = await waitForMessage(ws, 'state');

      // State should persist
      expect(stateMessage.state.personaMode).toBe('intense');
    });
  });

  describe('Hibernation', () => {
    it('should preserve state after hibernation wake', async () => {
      ws = await connect('hibernation-test', 'user-1', 'tenant-1');
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
