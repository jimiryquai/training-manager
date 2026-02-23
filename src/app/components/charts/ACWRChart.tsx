'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/app/components/ui/chart';
import { Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';

interface ACWRChartProps {
  data: {
    date: string;
    ratio: number;
    acute_load: number;
    chronic_load: number;
  }[];
}

const chartConfig = {
  ratio: {
    label: 'ACWR',
    color: 'var(--color-chart-1)',
  },
  danger: {
    label: 'Danger Zone',
    color: 'var(--color-destructive)',
  },
} satisfies ChartConfig;

export function ACWRChart({ data }: ACWRChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acute:Chronic Workload Ratio</CardTitle>
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
              domain={[0, 2.5]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine
              y={1.5}
              stroke="var(--destructive)"
              strokeDasharray="5 5"
              label={{ value: 'Danger', position: 'right', fill: 'var(--destructive)' }}
            />
            <Line
              type="monotone"
              dataKey="ratio"
              stroke="var(--color-ratio)"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
