'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Slider } from '@/app/components/ui/slider';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { logWellnessSchema, type LogWellnessInput } from './schemas';
import {
  wellnessMetrics,
  getSliderColor,
  getSliderTextColor,
  getMetricLabel,
} from '@/app/shared/wellnessConfig';

interface LogWellnessFormProps {
  onSubmit: (data: LogWellnessInput) => Promise<void>;
  defaultDate?: string;
}

export function LogWellnessForm({ onSubmit, defaultDate }: LogWellnessFormProps) {
  const form = useForm<LogWellnessInput>({
    resolver: zodResolver(logWellnessSchema),
    defaultValues: {
      date: defaultDate || new Date().toISOString().split('T')[0],
      rhr: 60,
      hrv_rmssd: 40,
      sleep_score: 3,
      fatigue_score: 3,
      muscle_soreness_score: 3,
      stress_score: 3,
      mood_score: 3,
      diet_score: 3,
    },
  });

  const handleSubmit = async (data: LogWellnessInput) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Wellness</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>The date of this measurement</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rhr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resting Heart Rate (bpm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormDescription>Your resting heart rate in beats per minute</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hrv_rmssd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HRV RMSSD (ms)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormDescription>Heart rate variability in milliseconds</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">Subjective Metrics</h3>
              {wellnessMetrics.map((metric) => (
                <FormField
                  key={metric.name}
                  control={form.control}
                  name={metric.name}
                  render={({ field }) => {
                    const value = field.value ?? 3;
                    return (
                      <FormItem>
                        <div className="flex justify-between items-center mb-2">
                          <FormLabel className="!mt-0">{metric.label}</FormLabel>
                          <span className={`font-bold ${getSliderTextColor(value, metric.polarity)}`}>
                            {value}/5 - {getMetricLabel(metric.name, value)}
                          </span>
                        </div>
                        <FormControl>
                          <Slider
                            min={1}
                            max={5}
                            step={1}
                            value={[value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            rangeClassName={getSliderColor(value, metric.polarity)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              ))}
            </div>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Wellness'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
