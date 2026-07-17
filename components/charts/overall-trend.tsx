'use client'

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltipFrame } from '@/components/charts/chart-tooltip'

export type TrendPoint = { label: string; avg: number; count: number }

/** FR-20 喜好度走勢（月＝逐日、年＝逐月）。單量值單軸，1–5 固定域。 */
export function OverallTrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        這段期間還沒有評分的沖煮
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={points}
        margin={{ top: 8, right: 12, bottom: 0, left: -18 }}
      >
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ stroke: 'var(--muted)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as TrendPoint
            return (
              <ChartTooltipFrame
                title={d.label}
                rows={[
                  { label: '平均喜好度', value: `★${d.avg}` },
                  { label: '沖煮數', value: `${d.count} 杯` },
                ]}
              />
            )
          }}
        />
        <Line
          type="monotone"
          dataKey="avg"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--chart-1)' }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
