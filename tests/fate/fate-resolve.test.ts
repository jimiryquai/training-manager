import { describe, it, expect } from 'vitest';
import { createResolver, dataView, list } from '@nkzw/fate/server';

interface WellnessMetric {
  id: string;
  date: string;
  rhr: number;
  hrv_rmssd: number;
  hrv_ratio: number;
  [key: string]: unknown;
}

interface ACWRData {
  acute_load: number;
  chronic_load: number;
  ratio: number;
  isDanger: boolean;
  [key: string]: unknown;
}

interface ReadinessViewData {
  acwr: ACWRData;
  wellnessHistory: WellnessMetric[];
  [key: string]: unknown;
}

const WellnessMetricView = dataView<WellnessMetric>('WellnessMetric')({
  id: true,
  date: true,
  rhr: true,
  hrv_rmssd: true,
  hrv_ratio: true,
});

const ACWRView = dataView<ACWRData>('ACWR')({
  acute_load: true,
  chronic_load: true,
  ratio: true,
  isDanger: true,
});

const ReadinessView = dataView<ReadinessViewData>('Readiness')({
  acwr: ACWRView,
  wellnessHistory: list(WellnessMetricView),
});

type AnyDataView = { fields: Record<string, unknown> };

function generateSelectPaths(view: AnyDataView, prefix = ''): string[] {
  const paths: string[] = [];
  for (const [field, config] of Object.entries(view.fields)) {
    const path = prefix ? `${prefix}.${field}` : field;
    if (config && typeof config === 'object' && 'fields' in (config as object)) {
      paths.push(...generateSelectPaths(config as AnyDataView, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

describe('Fate resolve() behavior', () => {
  it('should return all fields when using top-level select paths', async () => {
    const select = ['acwr', 'wellnessHistory'];
    
    const { resolve } = createResolver({
      ctx: {},
      select,
      view: ReadinessView,
    });

    const inputData: ReadinessViewData = {
      acwr: {
        acute_load: 100,
        chronic_load: 80,
        ratio: 1.25,
        isDanger: false,
      },
      wellnessHistory: [
        { id: '1', date: '2026-02-21', rhr: 55, hrv_rmssd: 45, hrv_ratio: 0.8 },
        { id: '2', date: '2026-02-20', rhr: 58, hrv_rmssd: 40, hrv_ratio: 0.7 },
      ],
    };

    const result = await resolve(inputData);
    console.log('Result with top-level select:', JSON.stringify(result, null, 2));

    expect(result.acwr).toBeDefined();
    expect(result.wellnessHistory).toBeDefined();
  });

  it('should return all fields when using nested select paths', async () => {
    const select = [
      'acwr.acute_load',
      'acwr.chronic_load',
      'acwr.ratio',
      'acwr.isDanger',
      'wellnessHistory.id',
      'wellnessHistory.date',
      'wellnessHistory.rhr',
      'wellnessHistory.hrv_rmssd',
      'wellnessHistory.hrv_ratio',
    ];
    
    const { resolve } = createResolver({
      ctx: {},
      select,
      view: ReadinessView,
    });

    const inputData: ReadinessViewData = {
      acwr: {
        acute_load: 100,
        chronic_load: 80,
        ratio: 1.25,
        isDanger: false,
      },
      wellnessHistory: [
        { id: '1', date: '2026-02-21', rhr: 55, hrv_rmssd: 45, hrv_ratio: 0.8 },
        { id: '2', date: '2026-02-20', rhr: 58, hrv_rmssd: 40, hrv_ratio: 0.7 },
      ],
    };

    const result = await resolve(inputData) as any;
    console.log('Result with nested select:', JSON.stringify(result, null, 2));

    expect(result.acwr.acute_load).toBe(100);
    expect(result.acwr.chronic_load).toBe(80);
    expect(result.wellnessHistory.items[0].node.rhr).toBe(55);
    expect(result.wellnessHistory.items[0].node.hrv_rmssd).toBe(45);
  });

  it('should work with auto-generated select paths', async () => {
    const select = generateSelectPaths(ReadinessView);
    console.log('Generated select paths:', select);
    
    const { resolve } = createResolver({
      ctx: {},
      select,
      view: ReadinessView,
    });

    const inputData: ReadinessViewData = {
      acwr: {
        acute_load: 100,
        chronic_load: 80,
        ratio: 1.25,
        isDanger: false,
      },
      wellnessHistory: [
        { id: '1', date: '2026-02-21', rhr: 55, hrv_rmssd: 45, hrv_ratio: 0.8 },
        { id: '2', date: '2026-02-20', rhr: 58, hrv_rmssd: 40, hrv_ratio: 0.7 },
      ],
    };

    const result = await resolve(inputData) as any;
    console.log('Result with auto-generated select:', JSON.stringify(result, null, 2));

    expect(result.acwr.acute_load).toBe(100);
    expect(result.acwr.chronic_load).toBe(80);
    expect(result.wellnessHistory.items[0].node.rhr).toBe(55);
    expect(result.wellnessHistory.items[0].node.hrv_rmssd).toBe(45);
  });

  it('should show what happens with just id in select', async () => {
    const select = ['wellnessHistory.id'];
    
    const { resolve } = createResolver({
      ctx: {},
      select,
      view: ReadinessView,
    });

    const inputData: ReadinessViewData = {
      acwr: {
        acute_load: 100,
        chronic_load: 80,
        ratio: 1.25,
        isDanger: false,
      },
      wellnessHistory: [
        { id: '1', date: '2026-02-21', rhr: 55, hrv_rmssd: 45, hrv_ratio: 0.8 },
      ],
    };

    const result = await resolve(inputData) as any;
    console.log('Result with only id select:', JSON.stringify(result, null, 2));

    expect(result.wellnessHistory.items[0].node.id).toBe('1');
  });
});
