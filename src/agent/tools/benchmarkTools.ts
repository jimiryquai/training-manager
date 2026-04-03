/**
 * Benchmark tool handlers for CoachAgent
 *
 * Uses service layer functions - no inline SQL.
 */

import type { ToolHandler, ToolContext, ToolParams } from './types';
import {
  getUserBenchmarks,
  upsertUserBenchmark,
} from '../../services/exerciseDictionary.service';
import type { BenchmarkUnit } from '../../db/schema';

/**
 * Get user benchmark values (1RMs, training maxes, etc.)
 */
export const getBenchmarks: ToolHandler = async (ctx: ToolContext, _params: ToolParams) => {
  return getUserBenchmarks(ctx.db, {
    tenant_id: ctx.tenantId,
    user_id: ctx.userId,
  });
};

/**
 * Update or create a user benchmark value
 */
export const updateBenchmark: ToolHandler = async (ctx: ToolContext, params: ToolParams) => {
  const unit = ((params.unit as string) || 'kg') as BenchmarkUnit;

  return upsertUserBenchmark(ctx.db, {
    tenant_id: ctx.tenantId,
    user_id: ctx.userId,
    benchmark_name: params.benchmark_name as string,
    benchmark_value: params.value as number,
    benchmark_unit: unit,
  });
};
