'use client';

import { useState, useEffect } from 'react';

interface ACWRData {
  acute_load: number;
  chronic_load: number;
  ratio: number;
  isDanger: boolean;
}

interface ACWRHistoryPoint {
  date: string;
  acute_load: number;
  chronic_load: number;
  ratio: number;
  isDanger: boolean;
}

interface WellnessMetric {
  id: string;
  date: string;
  rhr: number;
  hrv_rmssd: number;
}

interface ReadinessData {
  acwr: ACWRData;
  acwrHistory: ACWRHistoryPoint[];
  wellnessHistory: WellnessMetric[];
}

export function useReadinessData(date: string) {
  const [data, setData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(`/trpc/dashboard.getReadinessView?input=${encodeURIComponent(JSON.stringify({ date, history_days: 28 }))}`);
        const result = await response.json() as { result?: { data?: ReadinessData } };
        setData(result.result?.data ?? null);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch'));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [date]);

  return { data, loading, error };
}
