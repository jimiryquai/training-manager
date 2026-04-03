/**
 * CoachAgent - AI Coaching Engine powered by Cloudflare Agents
 *
 * Agent-Native AI Coach using WebSocket Hibernation.
 * Uses Kysely services for persistent data and internal SQLite for conversation history.
 * Supports dual AI providers: Workers AI (default) and OpenAI (premium).
 */

import { Agent, type Connection, type ConnectionContext, type WSMessage } from 'agents';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createWorkersAI } from 'workers-ai-provider';
import type { Database } from '../db/schema';
import type { SessionData } from '../session/UserSession';
import { toolRegistry } from './tools/registry';
import type { ToolContext } from './tools/types';

// ============================================================================
// Types
// ============================================================================

interface CoachAgentEnv extends Cloudflare.Env {
  // All fields inherited from Cloudflare.Env are required
  // At runtime, some may be undefined but TypeScript requires the types to match
}

export interface CoachAgentState {
  userId: string;
  tenantId: string;
  personaMode: 'supportive' | 'analytical' | 'intense' | 'recovery';
  lastInteractionAt: string;
  sessionContext: {
    currentPlanId?: string;
    currentWeek?: number;
    activeGoals: string[];
  };
}

export interface ConversationMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const COACH_TOOLS = {
  logWellness: 'Log daily wellness metrics (HRV, RHR, sleep, mood, etc.)',
  getWellness: 'Retrieve wellness data for a specific date or range',
  logWorkout: 'Log a completed workout session with duration and session RPE',
  getWorkoutHistory: 'Retrieve workout history for analysis',
  getACWR: 'Calculate Acute:Chronic Workload Ratio for injury risk assessment',
  getACWRTrend: 'Get ACWR trend over a date range for pattern analysis',
  getTrainingPlan: 'Get training plan details and scheduled sessions',
  getTodaysSession: 'Get the training session scheduled for today',
  getBenchmarks: 'Get user benchmark values (1RMs, training maxes, etc.)',
  updateBenchmark: 'Update or create a user benchmark value',
} as const;

// ============================================================================
// CoachAgent Class
// ============================================================================

export class CoachAgent extends Agent<CoachAgentEnv, CoachAgentState> {
  static options = { hibernate: true };

  initialState: CoachAgentState = {
    userId: '',
    tenantId: '',
    personaMode: 'supportive',
    lastInteractionAt: new Date().toISOString(),
    sessionContext: { activeGoals: [] },
  };

  private _db: Kysely<Database> | null = null;

  private getDb(): Kysely<Database> {
    if (!this._db) {
      this._db = new Kysely<Database>({
        dialect: new D1Dialect({ database: this.env.DB }),
      });
    }
    return this._db;
  }

  // ===========================================================================
  // Session Validation
  // ===========================================================================

  /**
   * Validate session cookie against UserSession DO
   * Returns session data if valid, null otherwise
   */
  private async validateSession(request: Request): Promise<{ userId: string; tenantId: string } | null> {
    try {
      // Extract session ID from cookie
      const cookieHeader = request.headers.get('Cookie');
      if (!cookieHeader) {
        console.log('[CoachAgent] No cookie header found');
        return null;
      }

      const sessionId = this.extractSessionId(cookieHeader);
      if (!sessionId) {
        console.log('[CoachAgent] No session_id cookie found');
        return null;
      }

      // Validate session ID signature
      const secretKey = this.env.SESSION_SECRET || this.env.AUTH_SECRET_KEY;
      if (!secretKey) {
        console.error('[CoachAgent] No session secret configured');
        return null;
      }

      const isValid = await this.isValidSessionId(sessionId, secretKey);
      if (!isValid) {
        console.log('[CoachAgent] Invalid session ID signature');
        return null;
      }

      // Get session from UserSession DO
      const { unsignedSessionId } = this.unpackSessionId(sessionId);
      const doId = this.env.USER_SESSION_DO.idFromName(unsignedSessionId);
      const sessionStub = this.env.USER_SESSION_DO.get(doId) as unknown as {
        getSession(): Promise<{ value: SessionData | null } | { error: string }>;
      };

      // Call getSession RPC method
      const result = await sessionStub.getSession();

      if ('error' in result) {
        console.log('[CoachAgent] Session error:', result.error);
        return null;
      }

      if (!result.value) {
        console.log('[CoachAgent] No session value found');
        return null;
      }

      return result.value;
    } catch (error) {
      console.error('[CoachAgent] Session validation error:', error);
      return null;
    }
  }

  /**
   * Extract session_id from cookie header
   */
  private extractSessionId(cookieHeader: string): string | null {
    for (const cookie of cookieHeader.split(';')) {
      const trimmedCookie = cookie.trim();
      const separatorIndex = trimmedCookie.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = trimmedCookie.slice(0, separatorIndex);
      const value = trimmedCookie.slice(separatorIndex + 1);
      if (key === 'session_id') {
        return value;
      }
    }
    return null;
  }

  /**
   * Unpack signed session ID into unsigned ID and signature
   */
  private unpackSessionId(packed: string): { unsignedSessionId: string; signature: string } {
    const [unsignedSessionId, signature] = atob(packed).split(':');
    return { unsignedSessionId, signature };
  }

  /**
   * Validate session ID signature using HMAC-SHA256
   */
  private async isValidSessionId(sessionId: string, secretKey: string): Promise<boolean> {
    try {
      const { unsignedSessionId, signature } = this.unpackSessionId(sessionId);
      const computedSignature = await this.signSessionId(unsignedSessionId, secretKey);
      return computedSignature === signature;
    } catch {
      return false;
    }
  }

  /**
   * Sign a session ID using HMAC-SHA256
   */
  private async signSessionId(unsignedSessionId: string, secretKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureArrayBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(unsignedSessionId));
    return this.arrayBufferToHex(signatureArrayBuffer);
  }

  /**
   * Convert ArrayBuffer to hex string
   */
  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const array = new Uint8Array(buffer);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ===========================================================================
  // Lifecycle Hooks
  // ===========================================================================

  async onStart(): Promise<void> {
    this.sql`
      CREATE TABLE IF NOT EXISTS conversation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `;
    this.sql`
      CREATE INDEX IF NOT EXISTS idx_conversation_created
      ON conversation_history(created_at DESC)
    `;
    console.log('[CoachAgent] Started with hibernation enabled');
  }

  async onConnect(connection: Connection, ctx: ConnectionContext): Promise<void> {
    // Validate session cookie against UserSession DO
    // Do NOT trust userId/tenantId from query params - extract from validated session
    const session = await this.validateSession(ctx.request);

    if (!session) {
      connection.send(JSON.stringify({
        type: 'error',
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing session',
      }));
      connection.close(1008, 'Unauthorized');
      return;
    }

    const { userId, tenantId } = session;
    console.log(`[CoachAgent] Connection accepted for userId=${userId}, tenantId=${tenantId}`);

    this.setState({
      ...this.state,
      userId,
      tenantId,
      lastInteractionAt: new Date().toISOString(),
    });

    connection.setState({ userId, tenantId, connectedAt: new Date().toISOString() });

    connection.send(JSON.stringify({
      type: 'connected',
      tools: Object.keys(COACH_TOOLS),
      toolDescriptions: COACH_TOOLS,
      persona: this.state.personaMode,
      message: 'CoachAgent connected. I am your AI coach - ask me anything about your training!',
    }));
  }

  async onMessage(connection: Connection, message: WSMessage): Promise<void> {
    const startTime = Date.now();

    try {
      const payload = typeof message === 'string'
        ? JSON.parse(message)
        : JSON.parse(new TextDecoder().decode(message as ArrayBuffer));

      console.log('[CoachAgent] Received:', payload.type);

      switch (payload.type) {
        case 'tool_call':
          await this.handleToolCall(connection, payload);
          break;
        case 'chat':
          await this.handleChatMessage(connection, payload);
          break;
        case 'set_persona':
          this.setPersona(payload.persona);
          connection.send(JSON.stringify({
            type: 'persona_updated',
            persona: this.state.personaMode,
          }));
          break;
        case 'get_state':
          connection.send(JSON.stringify({
            type: 'state',
            state: this.state,
          }));
          break;
        case 'get_history':
          this.sendConversationHistory(connection, payload.limit);
          break;
        default:
          connection.send(JSON.stringify({
            type: 'error',
            code: 'UNKNOWN_MESSAGE_TYPE',
            message: `Unknown message type: ${payload.type}`,
          }));
      }

      this.setState({
        ...this.state,
        lastInteractionAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error('[CoachAgent] Error:', error);
      connection.send(JSON.stringify({
        type: 'error',
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      }));
    }

    console.log(`[CoachAgent] Processed in ${Date.now() - startTime}ms`);
  }

  async onClose(
    connection: Connection,
    code: number,
    reason: string,
    wasClean: boolean
  ): Promise<void> {
    const connState = connection.state as { userId?: string } | null;
    console.log(`[CoachAgent] Connection closed for ${connState?.userId}: code=${code}`);
    await this.pruneConversationHistory();
  }

  async onError(connOrError: Connection | unknown, error?: unknown): Promise<void> {
    if (connOrError && typeof connOrError === 'object' && 'id' in connOrError) {
      console.error('[CoachAgent] WebSocket error:', error);
    } else {
      console.error('[CoachAgent] Error:', connOrError);
    }
  }

  // ===========================================================================
  // Tool Execution
  // ===========================================================================

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

      if (requestId) {
        connection.send(JSON.stringify({
          type: 'tool_result',
          requestId,
          result,
        }));
      }

      this.sql`
        INSERT INTO conversation_history (role, content)
        VALUES ('system', ${'Tool executed: ' + tool})
      `;

      return result;

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

  // ===========================================================================
  // Chat Handler
  // ===========================================================================

  private async handleChatMessage(
    connection: Connection,
    payload: { content: string; requestId?: string }
  ): Promise<void> {
    const { content, requestId } = payload;
    const { personaMode } = this.state;

    // Store user message
    this.sql`
      INSERT INTO conversation_history (role, content)
      VALUES ('user', ${content})
    `;

    // Fetch recent context (including the message we just stored)
    const history = this.sql<ConversationMessage>`
      SELECT role, content FROM conversation_history
      ORDER BY created_at DESC LIMIT 10
    `.reverse();

    // Choose model based on available keys (OpenAI premium, Workers AI default)
    // Check for valid OpenAI key (starts with sk- and has more than 10 chars)
    const hasValidOpenAIKey = this.env.OPENAI_API_KEY && 
      this.env.OPENAI_API_KEY.startsWith('sk-') && 
      this.env.OPENAI_API_KEY.length > 10;
    
    const model = hasValidOpenAIKey
      ? openai('gpt-4o-mini')
      : createWorkersAI({ binding: this.env.AI })('@cf/meta/llama-3.3-70b-instruct-fp8-fast');

    // Build context with persona
    const systemPrompt = this.getPersonaPrompt();

    try {
      const { text } = await generateText({
        model,
        system: systemPrompt,
        messages: history.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      // Store assistant response
      this.sql`
        INSERT INTO conversation_history (role, content)
        VALUES ('assistant', ${text})
      `;

      connection.send(JSON.stringify({
        type: 'chat_response',
        requestId,
        content: text,
        persona: personaMode,
      }));

    } catch (error) {
      console.error('[CoachAgent] AI error:', error);
      connection.send(JSON.stringify({
        type: 'error',
        code: 'AI_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate response',
      }));
    }
  }

  // ===========================================================================
  // Persona Prompts
  // ===========================================================================

  private getPersonaPrompt(): string {
    const prompts: Record<CoachAgentState['personaMode'], string> = {
      supportive: `You are a supportive, encouraging fitness coach. Celebrate wins, offer gentle guidance on setbacks, and keep the athlete motivated. Be warm and personable. Focus on building confidence and sustainable habits.`,
      analytical: `You are a data-driven performance coach. Focus on metrics, trends, and evidence-based recommendations. Be precise and thorough in your analysis. Help the athlete understand the numbers behind their training.`,
      intense: `You are a no-nonsense, high-performance coach. Push the athlete hard, demand accountability, and expect maximum effort. Be direct and challenging. Help them break through plateaus.`,
      recovery: `You are a recovery and wellness focused coach. Prioritize rest, stress management, and sustainable training. Be calming and restorative. Help the athlete understand the importance of recovery for long-term success.`,
    };
    return prompts[this.state.personaMode];
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private setPersona(persona: CoachAgentState['personaMode']): void {
    this.setState({
      ...this.state,
      personaMode: persona,
      lastInteractionAt: new Date().toISOString(),
    });
  }

  private sendConversationHistory(connection: Connection, limit: number = 50): void {
    const history = this.sql<ConversationMessage>`
      SELECT id, role, content, created_at
      FROM conversation_history
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    connection.send(JSON.stringify({
      type: 'history',
      messages: history.reverse(),
    }));
  }

  private async pruneConversationHistory(): Promise<void> {
    const countResult = this.sql<{ count: number }>`
      SELECT COUNT(*) as count FROM conversation_history
    `;

    const count = countResult[0]?.count ?? 0;

    if (count > 100) {
      this.sql`
        DELETE FROM conversation_history
        WHERE id NOT IN (
          SELECT id FROM conversation_history
          ORDER BY created_at DESC
          LIMIT 50
        )
      `;
      console.log(`[CoachAgent] Pruned ${count - 50} old messages`);
    }
  }

  async scheduleReminder(
    when: Date | number,
    type: 'check_in' | 'workout_reminder' | 'rest_day',
    message: string
  ): Promise<void> {
    await this.schedule(when, 'sendReminder', {
      type,
      message,
      userId: this.state.userId,
    });
  }

  async sendReminder(payload: { type: string; message: string }): Promise<void> {
    this.broadcast(JSON.stringify({
      type: 'reminder',
      reminderType: payload.type,
      message: payload.message,
    }));
  }
}
