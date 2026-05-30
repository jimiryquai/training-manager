/**
 * Tool registry for CoachAgent
 *
 * Maps tool names to their handler functions.
 */

import type { ToolHandler } from './types';
import { logWellness, getWellness } from './wellnessTools';
import { getTrainingPlan, getTodaysSession } from './planTools';
import { getBenchmarks, updateBenchmark } from './benchmarkTools';

export const toolRegistry: Record<string, ToolHandler> = {
  logWellness,
  getWellness,
  getTrainingPlan,
  getTodaysSession,
  getBenchmarks,
  updateBenchmark,
};

export function getToolNames(): string[] {
  return Object.keys(toolRegistry);
}
