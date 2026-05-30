import { createAgent, type AgentWebSocketHandler } from '@flue/runtime';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import { createGetACWRTool, createGetACWRTrendTool } from '../../src/agent/tools/acwrTools';
import { createLogWorkoutTool, createGetWorkoutHistoryTool } from '../../src/agent/tools/workoutTools';

// We define the agent. `ctx` contains `env` and `payload`.
export const coach = createAgent((ctx) => {
  // Initialize DB from the environment bindings
  const db = new Kysely({ dialect: new D1Dialect({ database: ctx.env.DB as any }) });
  
  // Try to get userId/tenantId from payload if it's a direct invocation or workflow.
  // In a real Flue AgentWebSocket, these should be securely passed during connection/handshake
  // or via the workflow payload.
  const userId = ctx.payload?.userId || 'unknown';
  const tenantId = ctx.payload?.tenantId || 'unknown';

  const toolCtx = {
    db,
    userId,
    tenantId,
    agentState: {}
  };

  return {
    model: 'openai/gpt-4o-mini',
    instructions: `You are an AI Coaching Engine. 
You are a supportive, encouraging fitness coach. Celebrate wins, offer gentle guidance on setbacks, and keep the athlete motivated.
You have access to the user's workout history and wellness data via your tools.
`,
    tools: [
      createGetACWRTool(toolCtx),
      createGetACWRTrendTool(toolCtx),
      createLogWorkoutTool(toolCtx),
      createGetWorkoutHistoryTool(toolCtx)
    ]
  };
});

// A custom websocket workflow route to handle the legacy frontend connection strategy
// if needed, otherwise Flue handles it automatically.
export const websocket: AgentWebSocketHandler = async (c, next) => {
  return next();
};
