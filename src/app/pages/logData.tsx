'use client';

import { useState } from 'react';
import { LogWellnessForm } from '@/app/components/forms/LogWellnessForm';
import { LogWorkoutForm } from '@/app/components/forms/LogWorkoutForm';
import { toast } from '@/app/hooks/use-toast';
import type { LogWellnessInput } from '@/app/components/forms/schemas';
import type { LogWorkoutInput } from '@/app/components/forms/schemas';

async function submitWellness(data: LogWellnessInput) {
  const response = await fetch('/trpc/wellness.logDailyMetrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save wellness data');
  return response.json();
}

async function submitWorkout(data: LogWorkoutInput) {
  const response = await fetch('/trpc/training.logSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save workout data');
  return response.json();
}

export function LogData() {
  const today = new Date().toISOString().split('T')[0];
  const [refreshKey, setRefreshKey] = useState(0);

  const handleWellnessSubmit = async (formData: LogWellnessInput) => {
    try {
      await submitWellness(formData);
      toast({ title: 'Success', description: 'Wellness data saved' });
      setRefreshKey((k) => k + 1);
    } catch {
      toast({ title: 'Error', description: 'Failed to save wellness data', variant: 'destructive' });
    }
  };

  const handleWorkoutSubmit = async (formData: LogWorkoutInput) => {
    try {
      await submitWorkout(formData);
      toast({ title: 'Success', description: 'Workout data saved' });
      setRefreshKey((k) => k + 1);
    } catch {
      toast({ title: 'Error', description: 'Failed to save workout data', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Log Data</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LogWellnessForm onSubmit={handleWellnessSubmit} defaultDate={today} key={`wellness-${refreshKey}`} />
        <LogWorkoutForm onSubmit={handleWorkoutSubmit} defaultDate={today} key={`workout-${refreshKey}`} />
      </div>
    </div>
  );
}
