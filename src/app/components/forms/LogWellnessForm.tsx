'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Slider } from '@/app/components/ui/slider';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/app/components/ui/field';
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
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FieldGroup>
            <Controller
              name="date"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="wellness-date">Date</FieldLabel>
                  <Input
                    {...field}
                    id="wellness-date"
                    type="date"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>The date of this measurement</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="rhr"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="wellness-rhr">Resting Heart Rate (bpm)</FieldLabel>
                  <Input
                    {...field}
                    id="wellness-rhr"
                    type="number"
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                  <FieldDescription>Your resting heart rate in beats per minute</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="hrv_rmssd"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="wellness-hrv">HRV RMSSD (ms)</FieldLabel>
                  <Input
                    {...field}
                    id="wellness-hrv"
                    type="number"
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                  <FieldDescription>Heart rate variability in milliseconds</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium">Subjective Metrics</h3>
            <FieldGroup>
              {wellnessMetrics.map((metric) => (
                <Controller
                  key={metric.name}
                  name={metric.name}
                  control={form.control}
                  render={({ field, fieldState }) => {
                    const value = field.value ?? 3;
                    return (
                      <Field data-invalid={fieldState.invalid}>
                        <div className="flex justify-between items-center mb-2">
                          <FieldLabel htmlFor={`wellness-${metric.name}`} className="!mt-0">
                            {metric.label}
                          </FieldLabel>
                          <span className={`font-bold ${getSliderTextColor(value, metric.polarity)}`}>
                            {value}/5 - {getMetricLabel(metric.name, value)}
                          </span>
                        </div>
                        <Slider
                          id={`wellness-${metric.name}`}
                          min={1}
                          max={5}
                          step={1}
                          value={[value]}
                          onValueChange={(vals: number | readonly number[]) => field.onChange(Array.isArray(vals) ? vals[0] : vals)}
                          rangeClassName={getSliderColor(value, metric.polarity)}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    );
                  }}
                />
              ))}
            </FieldGroup>
          </div>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : 'Save Wellness'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
