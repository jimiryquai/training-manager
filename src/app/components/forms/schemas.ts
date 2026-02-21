import { z } from 'zod';

export const logWellnessSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  rhr: z.number().int().min(30).max(200),
  hrv_rmssd: z.number().min(0).max(200),
});

export const logWorkoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  modality: z.enum(['strength', 'rowing', 'running', 'cycling', 'swimming', 'other']),
  duration_minutes: z.number().int().min(1).max(480),
  srpe: z.number().int().min(1).max(10),
});

export type LogWellnessInput = z.infer<typeof logWellnessSchema>;
export type LogWorkoutInput = z.infer<typeof logWorkoutSchema>;
