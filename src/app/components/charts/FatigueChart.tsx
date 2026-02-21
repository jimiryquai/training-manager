'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/app/components/ui/chart';
import { Line, LineChart, XAxis, YAxis } from 'recharts';

interface FatigueChartProps {
  data: {
    date: string;
    rhr: number;
    hrv_rmssd: number;
  }[];
}

const chartConfig = {
  rhr: {
    label: 'RHR (bpm)',
    color: 'hsl(var(--chart-1))',
  },
  hrv_rmssd: {
    label: 'HRV (ms)',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function FatigueChart({ data }: FatigueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fatigue Indicators</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <XAxis
              dataKey="date"
              tickFormatter={(value) => value.slice(5)}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="rhr"
              stroke="var(--color-rhr)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="hrv_rmssd"
              stroke="var(--color-hrv_rmssd)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
