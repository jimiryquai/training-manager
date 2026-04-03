/**
 * Workout tool handlers for CoachAgent
 */

import type { ToolHandler, ToolContext, ToolParams } from './types';
import {
  createWorkoutSessionViaAgent,
  getWorkoutSessionsByDateRange,
} from '../../services/workoutSession.service';

/**
 * Log a completed workout session with duration and session RPE
 */
export const logWorkout: ToolHandler = async (ctx: ToolContext, params: ToolParams) => {
  return createWorkoutSessionViaAgent(ctx.db, {
    tenant_id: ctx.tenantId,
    user_id: ctx.userId,
    date: params.date as string,
    duration_minutes: params.duration_minutes as number,
    srpe: params.srpe as number,
    planned_session_id: params.planned_session_id as string | undefined,
    completed_as_planned: (params.completed_as_planned as number) ?? 1,
    agent_reasoning: (params.modifications as string) || 'Logged via CoachAgent',
  });
};

/**
 * Retrieve workout history for analysis
 */
export const getWorkoutHistory: ToolHandler = async (ctx: ToolContext, params: ToolParams) => {
  return getWorkoutSessionsByDateRange(ctx.db, {
    tenant_id: ctx.tenantId,
    user_id: ctx.userId,
    start_date: params.start_date as string,
    end_date: params.end_date as string,
  });
};
