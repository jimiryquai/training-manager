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
import type { Database, BenchmarkUnit } from '../db/schema';

// ============================================================================
// Types
// ============================================================================

interface CoachAgentEnv extends Cloudflare.Env {
  DB: D1Database;
  AI: Ai;
  OPENAI_API_KEY?: string;
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
    const url = new URL(ctx.request.url);
    const userId = url.searchParams.get('userId') || ctx.request.headers.get('X-User-ID');
    const tenantId = url.searchParams.get('tenantId') || ctx.request.headers.get('X-Tenant-ID');

    if (!userId || !tenantId) {
      connection.send(JSON.stringify({
        type: 'error',
        code: 'UNAUTHORIZED',
        message: 'Missing userId or tenantId in query params or headers',
      }));
      connection.close(1008, 'Unauthorized');
      return;
    }

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

    console.log(`[CoachAgent] Connection established for user ${userId}`);
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

    try {
      const db = this.getDb();
      const services = await import('../services');
      let result: unknown;

      switch (tool) {
        case 'logWellness':
          result = await services.createDailyWellnessViaAgent(db, {
            tenant_id: tenantId,
            user_id: userId,
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
          break;

        case 'getWellness':
          if (params.start_date && params.end_date) {
            result = await services.getDailyWellnessByDateRange(db, {
              tenant_id: tenantId,
              user_id: userId,
              start_date: params.start_date as string,
              end_date: params.end_date as string,
            });
          } else {
            result = await services.getDailyWellnessByDate(db, {
              tenant_id: tenantId,
              user_id: userId,
              date: (params.date as string) || new Date().toISOString().split('T')[0],
            });
          }
          break

        case 'logWorkout':
          result = await services.createWorkoutSessionViaAgent(db, {
            tenant_id: tenantId,
            user_id: userId,
            date: params.date as string,
            duration_minutes: params.duration_minutes as number,
            srpe: params.srpe as number,
            planned_session_id: params.planned_session_id as string | undefined,
            completed_as_planned: (params.completed_as_planned as number) ?? 1,
            agent_reasoning: (params.modifications as string) || 'Logged via CoachAgent',
          });
          break

        case 'getWorkoutHistory':
          result = await services.getWorkoutSessionsByDateRange(db, {
            tenant_id: tenantId,
            user_id: userId,
            start_date: params.start_date as string,
            end_date: params.end_date as string,
          });
          break

        case 'getACWR':
          result = await services.calculateACWR(db, {
            tenant_id: tenantId,
            user_id: userId,
            date: (params.date as string) || new Date().toISOString().split('T')[0],
          });
          break

        case 'getACWRTrend':
          result = await services.calculateHistoricalACWR(db, {
            tenant_id: tenantId,
            user_id: userId,
            start_date: params.start_date as string,
            end_date: params.end_date as string,
          });
          break

        case 'getTrainingPlan':
          if (params.plan_id) {
            result = await services.getFullTrainingPlan(db, {
              id: params.plan_id as string,
              tenant_id: tenantId,
            });
          } else {
            result = await services.getTrainingPlansForTenant(db, tenantId);
          }
          break

        case 'getTodaysSession': {
          const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          if (this.state.sessionContext.currentPlanId) {
            const sessions = await services.getTrainingSessionsByPlan(db, {
              plan_id: this.state.sessionContext.currentPlanId,
              tenant_id: tenantId,
            });
            result = sessions.find(s => s.day_of_week === dayOfWeek) || null;
          } else {
            result = null;
          }
          break;
        }

        case 'getBenchmarks':
          result = await db
            .selectFrom('user_benchmarks')
            .where('tenant_id', '=', tenantId)
            .where('user_id', '=', userId)
            .selectAll()
            .execute();
          break;

        case 'updateBenchmark': {
          const now = new Date().toISOString();
          const unit = ((params.unit as string) || 'kg') as BenchmarkUnit;

          const updated = await db
            .updateTable('user_benchmarks')
            .set({
              benchmark_value: params.value as number,
              benchmark_unit: unit,
              updated_at: now,
            })
            .where('tenant_id', '=', tenantId)
            .where('user_id', '=', userId)
            .where('benchmark_name', '=', params.benchmark_name as string)
            .returningAll()
            .executeTakeFirst();

          if (!updated) {
            result = await db
              .insertInto('user_benchmarks')
              .values({
                id: crypto.randomUUID(),
                tenant_id: tenantId,
                user_id: userId,
                benchmark_name: params.benchmark_name as string,
                benchmark_value: params.value as number,
                benchmark_unit: unit,
                created_at: now,
                updated_at: now,
              })
              .returningAll()
              .executeTakeFirst();
          } else {
            result = updated;
          }
          break;
        }

        default:
          connection.send(JSON.stringify({
            type: 'tool_error',
            requestId,
            error: `Unknown tool: ${tool}`,
          }));
          return undefined;
      }

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
