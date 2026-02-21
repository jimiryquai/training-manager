import { dataView, list, type Entity } from '@nkzw/fate/server';

export interface ACWRData {
  acute_load: number;
  chronic_load: number;
  ratio: number;
  isDanger: boolean;
  [key: string]: unknown;
}

export interface WellnessMetric {
  id: string;
  date: string;
  rhr: number;
  hrv_rmssd: number;
  hrv_ratio: number;
  [key: string]: unknown;
}

export const ACWRView = dataView<ACWRData>('ACWR')({
  acute_load: true,
  chronic_load: true,
  ratio: true,
  isDanger: true,
});

export const WellnessMetricView = dataView<WellnessMetric>('WellnessMetric')({
  id: true,
  date: true,
  rhr: true,
  hrv_rmssd: true,
  hrv_ratio: true,
});

export interface ReadinessViewData {
  acwr: ACWRData;
  wellnessHistory: WellnessMetric[];
  [key: string]: unknown;
}

export const ReadinessView = dataView<ReadinessViewData>('Readiness')({
  acwr: ACWRView,
  wellnessHistory: list(WellnessMetricView),
});

export type ACWR = Entity<typeof ACWRView, 'ACWR'>;
export type WellnessMetricEntity = Entity<typeof WellnessMetricView, 'WellnessMetric'>;
export type Readiness = Entity<typeof ReadinessView, 'Readiness'>;
