export type PolarityType = 'standard' | 'inverted';

export interface WellnessMetricConfig {
  name: 'sleep_score' | 'fatigue_score' | 'muscle_soreness_score' | 'stress_score' | 'mood_score' | 'diet_score';
  label: string;
  polarity: PolarityType;
  labels: [string, string, string, string, string];
}

export const wellnessMetrics: WellnessMetricConfig[] = [
  {
    name: 'sleep_score',
    label: '😴 Sleep Quality',
    polarity: 'standard',
    labels: ['Poor', 'Below Average', 'Average', 'Good', 'Excellent'],
  },
  {
    name: 'diet_score',
    label: '🍎 Diet Quality',
    polarity: 'standard',
    labels: ['Poor', 'Below Average', 'Average', 'Good', 'Excellent'],
  },
  {
    name: 'mood_score',
    label: '😊 Mood',
    polarity: 'standard',
    labels: ['Miserable', 'Low', 'Neutral', 'Good', 'Fantastic'],
  },
  {
    name: 'muscle_soreness_score',
    label: '💪 Muscle Soreness',
    polarity: 'inverted',
    labels: ['No Soreness', 'Mild', 'Moderate', 'Significant', 'Severe'],
  },
  {
    name: 'stress_score',
    label: '😰 Stress Level',
    polarity: 'inverted',
    labels: ['No Stress', 'Low', 'Moderate', 'High', 'Highly Stressed'],
  },
  {
    name: 'fatigue_score',
    label: '🔋 Fatigue Level',
    polarity: 'inverted',
    labels: ['Fresh', 'Slightly Tired', 'Moderate', 'Tired', 'Exhausted'],
  },
];

export function getSliderColor(value: number, polarity: PolarityType): string {
  const normalizedValue = polarity === 'inverted' ? 6 - value : value;
  
  if (normalizedValue <= 1) return 'bg-red-500';
  if (normalizedValue === 2) return 'bg-orange-500';
  if (normalizedValue === 3) return 'bg-yellow-500';
  if (normalizedValue === 4) return 'bg-lime-500';
  return 'bg-green-500';
}

export function getSliderTextColor(value: number, polarity: PolarityType): string {
  const normalizedValue = polarity === 'inverted' ? 6 - value : value;
  
  if (normalizedValue <= 1) return 'text-red-500';
  if (normalizedValue === 2) return 'text-orange-500';
  if (normalizedValue === 3) return 'text-yellow-500';
  if (normalizedValue === 4) return 'text-lime-500';
  return 'text-green-500';
}

export function getMetricLabel(name: WellnessMetricConfig['name'], value: number): string {
  const metric = wellnessMetrics.find(m => m.name === name);
  if (!metric) return '';
  return metric.labels[value - 1] || '';
}
