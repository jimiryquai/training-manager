/**
 * Tool registry for CoachAgent
 *
 * Maps tool names to their handler functions.
 */

import type { ToolHandler } from './types';
import { logWellness, getWellness } from './wellnessTools';
import { logWorkout, getWorkoutHistory } from './workoutTools';
import { getACWR, getACWRTrend } from './acwrTools';
import { getTrainingPlan, getTodaysSession } from './planTools';
import { getBenchmarks, updateBenchmark } from './benchmarkTools';

export const toolRegistry: Record<string, ToolHandler> = {
  logWellness,
  getWellness,
  logWorkout,
  getWorkoutHistory,
  getACWR,
  getACWRTrend,
  getTrainingPlan,
  getTodaysSession,
  getBenchmarks,
  updateBenchmark,
};

export function getToolNames(): string[] {
  return Object.keys(toolRegistry);
}
