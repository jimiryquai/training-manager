/**
 * Workout tool handlers for CoachAgent
 */

import { Type, defineTool } from '@flue/runtime';
import type { ToolContext } from './types';
import {
  createWorkoutSessionViaAgent,
  getWorkoutSessionsByDateRange,
} from '../../services/workoutSession.service';

/**
 * Log a completed workout session with duration and session RPE
 */
export const createLogWorkoutTool = (ctx: ToolContext) => defineTool({
  name: 'log_workout',
  description: 'Log a completed workout session with duration and session RPE',
  parameters: Type.Object({
    date: Type.String({ description: 'Date of the workout in YYYY-MM-DD format' }),
    duration_minutes: Type.Number({ description: 'Duration of the workout in minutes' }),
    srpe: Type.Number({ description: 'Session Rating of Perceived Exertion (0-10)' }),
    planned_session_id: Type.Optional(Type.String({ description: 'ID of the planned session if this was from a plan' })),
    completed_as_planned: Type.Optional(Type.Number({ description: '1 if completed as planned, 0 if modified' })),
    modifications: Type.Optional(Type.String({ description: 'Reasoning or modifications made to the session' })),
  }),
  execute: async ({ date, duration_minutes, srpe, planned_session_id, completed_as_planned, modifications }) => {
    const result = await createWorkoutSessionViaAgent(ctx.db, {
      tenant_id: ctx.tenantId,
      user_id: ctx.userId,
      date,
      duration_minutes,
      srpe,
      planned_session_id,
      completed_as_planned: completed_as_planned ?? 1,
      agent_reasoning: modifications || 'Logged via CoachAgent',
    });
    return JSON.stringify(result);
  }
});

/**
 * Retrieve workout history for analysis
 */
export const createGetWorkoutHistoryTool = (ctx: ToolContext) => defineTool({
  name: 'get_workout_history',
  description: 'Retrieve workout history over a date range for analysis',
  parameters: Type.Object({
    start_date: Type.String({ description: 'Start date in YYYY-MM-DD format' }),
    end_date: Type.String({ description: 'End date in YYYY-MM-DD format' }),
  }),
  execute: async ({ start_date, end_date }) => {
    const result = await getWorkoutSessionsByDateRange(ctx.db, {
      tenant_id: ctx.tenantId,
      user_id: ctx.userId,
      start_date,
      end_date,
    });
    return JSON.stringify(result);
  }
});
