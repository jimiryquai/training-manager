'use client';

import { useState } from 'react';
import { ACWRChart, FatigueChart } from '@/app/components/charts';
import { useReadinessData } from '@/app/hooks/useReadinessData';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

export function Dashboard() {
  const today = new Date().toISOString().split('T')[0];
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useReadinessData(today);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Error loading dashboard: {error.message}</p>
      </div>
    );
  }

  const acwrMap = new Map(data?.acwrHistory?.map(a => [a.date, a]) ?? []);
  const chartData = data?.wellnessHistory.map((w) => {
    const acwr = acwrMap.get(w.date);
    return {
      date: w.date,
      ratio: acwr?.ratio ?? 0,
      acute_load: acwr?.acute_load ?? 0,
      chronic_load: acwr?.chronic_load ?? 0,
      rhr: w.rhr,
      hrv_rmssd: w.hrv_rmssd,
    };
  }) || [];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Readiness Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ACWRChart data={chartData} key={`acwr-${refreshKey}`} />
        <FatigueChart data={chartData} key={`fatigue-${refreshKey}`} />
      </div>

      {data?.acwr && (
        <Card>
          <CardHeader>
            <CardTitle>Current ACWR Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{data.acwr.acute_load.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Acute Load (7d)</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{data.acwr.chronic_load.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Chronic Load (28d avg)</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${data.acwr.isDanger ? 'text-destructive' : 'text-primary'}`}>
                  {data.acwr.ratio.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Ratio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
