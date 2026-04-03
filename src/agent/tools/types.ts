/**
 * Shared types for CoachAgent tool handlers
 */

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
 * A tool handler function.
 * Pure function — takes context + params, returns a result.
 * No side effects on WebSocket connections or agent state.
 * Throws on error; the caller (handleToolCall) catches and handles errors.
 */
export type ToolHandler = (
  ctx: ToolContext,
  params: ToolParams
) => Promise<unknown>;
