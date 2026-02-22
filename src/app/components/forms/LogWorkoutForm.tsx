'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/app/components/ui/field';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { logWorkoutSchema, type LogWorkoutInput } from './schemas';

interface LogWorkoutFormProps {
  onSubmit: (data: LogWorkoutInput) => Promise<void>;
  defaultDate?: string;
}

const modalities = [
  { value: 'strength', label: 'Strength Training' },
  { value: 'rowing', label: 'Rowing' },
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'other', label: 'Other' },
] as const;

export function LogWorkoutForm({ onSubmit, defaultDate }: LogWorkoutFormProps) {
  const form = useForm<LogWorkoutInput>({
    resolver: zodResolver(logWorkoutSchema),
    defaultValues: {
      date: defaultDate || new Date().toISOString().split('T')[0],
      modality: 'strength',
      duration_minutes: 60,
      srpe: 5,
    },
  });

  const handleSubmit = async (data: LogWorkoutInput) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Workout</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FieldGroup>
            <Controller
              name="date"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="workout-date">Date</FieldLabel>
                  <Input
                    {...field}
                    id="workout-date"
                    type="date"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="modality"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="workout-modality">Activity Type</FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="workout-modality"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {modalities.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="duration_minutes"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="workout-duration">Duration (minutes)</FieldLabel>
                  <Input
                    {...field}
                    id="workout-duration"
                    type="number"
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="srpe"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="workout-srpe">sRPE (1-10)</FieldLabel>
                  <Input
                    {...field}
                    id="workout-srpe"
                    type="number"
                    min={1}
                    max={10}
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                  <FieldDescription>Session Rating of Perceived Exertion</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : 'Save Workout'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
