/**
 * ACWR (Acute:Chronic Workload Ratio) tool handlers for CoachAgent
 */

import { Type, defineTool } from '@flue/runtime';
import type { ToolContext } from './types';
import {
  calculateACWR,
  calculateHistoricalACWR,
} from '../../services/acwr.service';

/**
 * Calculate Acute:Chronic Workload Ratio for injury risk assessment
 */
export const createGetACWRTool = (ctx: ToolContext) => defineTool({
  name: 'get_acwr',
  description: 'Calculate Acute:Chronic Workload Ratio for injury risk assessment for a specific date',
  parameters: Type.Object({
    date: Type.Optional(Type.String({ description: 'Date in YYYY-MM-DD format. Defaults to today.' })),
  }),
  execute: async ({ date }) => {
    const result = await calculateACWR(ctx.db, {
      tenant_id: ctx.tenantId,
      user_id: ctx.userId,
      date: date || new Date().toISOString().split('T')[0],
    });
    return JSON.stringify(result);
  }
});

/**
 * Get ACWR trend over a date range for pattern analysis
 */
export const createGetACWRTrendTool = (ctx: ToolContext) => defineTool({
  name: 'get_acwr_trend',
  description: 'Get ACWR trend over a date range for pattern analysis',
  parameters: Type.Object({
    start_date: Type.String({ description: 'Start date in YYYY-MM-DD format' }),
    end_date: Type.String({ description: 'End date in YYYY-MM-DD format' }),
  }),
  execute: async ({ start_date, end_date }) => {
    const result = await calculateHistoricalACWR(ctx.db, {
      tenant_id: ctx.tenantId,
      user_id: ctx.userId,
      start_date,
      end_date,
    });
    return JSON.stringify(result);
  }
});
