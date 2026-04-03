/**
 * Training plan tool handlers for CoachAgent
 */

import type { ToolHandler, ToolContext, ToolParams } from './types';
import {
  getFullTrainingPlan,
  getTrainingPlansForTenant,
} from '../../services/trainingPlan.service';
import { getTrainingSessionsByPlan } from '../../services/trainingSession.service';

/**
 * Get training plan details and scheduled sessions
 */
export const getTrainingPlan: ToolHandler = async (ctx: ToolContext, params: ToolParams) => {
  if (params.plan_id) {
    return getFullTrainingPlan(ctx.db, {
      id: params.plan_id as string,
      tenant_id: ctx.tenantId,
    });
  }
  return getTrainingPlansForTenant(ctx.db, ctx.tenantId);
};

/**
 * Get the training session scheduled for today
 */
export const getTodaysSession: ToolHandler = async (ctx: ToolContext, _params: ToolParams) => {
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const currentPlanId = ctx.agentState.sessionContext.currentPlanId;

  if (!currentPlanId) {
    return null;
  }

  const sessions = await getTrainingSessionsByPlan(ctx.db, {
    plan_id: currentPlanId,
    tenant_id: ctx.tenantId,
  });

  return sessions.find(s => s.day_of_week === dayOfWeek) || null;
};
