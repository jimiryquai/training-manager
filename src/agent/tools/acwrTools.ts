/**
 * ACWR (Acute:Chronic Workload Ratio) tool handlers for CoachAgent
 */

import type { ToolHandler, ToolContext, ToolParams } from './types';
import {
  calculateACWR,
  calculateHistoricalACWR,
} from '../../services/acwr.service';

/**
 * Calculate Acute:Chronic Workload Ratio for injury risk assessment
 */
export const getACWR: ToolHandler = async (ctx: ToolContext, params: ToolParams) => {
  return calculateACWR(ctx.db, {
    tenant_id: ctx.tenantId,
    user_id: ctx.userId,
    date: (params.date as string) || new Date().toISOString().split('T')[0],
  });
};

/**
 * Get ACWR trend over a date range for pattern analysis
 */
export const getACWRTrend: ToolHandler = async (ctx: ToolContext, params: ToolParams) => {
  return calculateHistoricalACWR(ctx.db, {
    tenant_id: ctx.tenantId,
    user_id: ctx.userId,
    start_date: params.start_date as string,
    end_date: params.end_date as string,
  });
};
