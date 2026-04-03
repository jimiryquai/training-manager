/**
 * Agent module exports
 */

export { CoachAgent, COACH_TOOLS } from './CoachAgent';
export type { CoachAgentState, ConversationMessage } from './CoachAgent';
export { toolRegistry } from './tools/registry';
export type { ToolContext, ToolHandler, ToolParams } from './tools/types';
