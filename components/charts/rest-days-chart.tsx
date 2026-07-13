'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltipFrame } from '@/components/charts/chart-tooltip'

export type RestDayPoint = { rest_days: number; overall: number }

/**
 * A3 適飲窗口：X=養豆天數、Y=整體喜好度。
 * 點＝單次沖煮（附 2px surface ring），線＝同天數平均（同一量值的衍生，同色）。
 */
export function RestDaysChart({
  points,
  height = 260,
}: {
  points: RestDayPoint[]
  height?: number
}) {
  const avgLine = useMemo(() => {
    const byDay = new Map<number, number[]>()
    for (const p of points) {
      const list = byDay.get(p.rest_days) ?? []
      list.push(p.overall)
      byDay.set(p.rest_days, list)
    }
    return [...byDay.entries()]
      .map(([rest_days, scores]) => ({
        rest_days,
        avg:
          Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 10,
          ) / 10,
      }))
      .sort((a, b) => a.rest_days - b.rest_days)
  }, [points])

  if (points.length < 2) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        至少需要 2 筆有喜好度的沖煮才能畫出趨勢
      </p>
    )
  }

  return (
    <div className="space-y-1">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart margin={{ top: 8, right: 12, bottom: 4, left: -20 }}>
          <XAxis
            type="number"
            dataKey="rest_days"
            domain={[0, 'dataMax']}
            allowDecimals={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
            label={{
              value: '養豆天數',
              position: 'insideBottomRight',
              offset: -2,
              fontSize: 11,
              fill: 'var(--muted-foreground)',
            }}
          />
          <YAxis
            type="number"
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: 'var(--border)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as RestDayPoint & { avg?: number }
              return (
                <ChartTooltipFrame
                  title={`養豆 ${d.rest_days} 天`}
                  rows={[
                    d.avg != null
                      ? { label: '當日平均', value: `★${d.avg}` }
                      : { label: '喜好度', value: `★${d.overall}` },
                  ]}
                />
              )
            }}
          />
          <Scatter
            data={points}
            dataKey="overall"
            fill="var(--chart-1)"
            stroke="var(--card)"
            strokeWidth={2}
            r={4}
          />
          <Line
            data={avgLine}
            dataKey="avg"
            type="monotone"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
            activeDot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-muted-foreground text-center text-xs">
        點＝單次沖煮 · 線＝同天數平均
      </p>
    </div>
  )
}
