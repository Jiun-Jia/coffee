'use client'

import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltipFrame } from '@/components/charts/chart-tooltip'

export type TagStat = {
  id: string
  name: string
  category: string | null
  count: number
  avgOverall: number
}

/**
 * A4 風味標籤統計：橫向長條（長度＝出現次數），
 * 平均喜好度以 text token 直接標示於條末（單一量值、單一軸）。
 * 只取前 15 名（整體分佈交給風味輪檢視）。
 */
export function TagStatsChart({ stats }: { stats: TagStat[] }) {
  if (stats.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        還沒有掛上風味標籤的沖煮
      </p>
    )
  }

  const data = stats.slice(0, 15).map((s) => ({
    ...s,
    endLabel: `${s.count} 次 · ★${s.avgOverall}`,
  }))
  const height = data.length * 32 + 16

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 84, bottom: 0, left: 0 }}
      >
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={72}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--muted)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as (typeof data)[number]
            return (
              <ChartTooltipFrame
                title={d.name}
                rows={[
                  { label: '出現次數', value: `${d.count} 次` },
                  { label: '平均喜好度', value: `★${d.avgOverall}` },
                ]}
              />
            )
          }}
        />
        <Bar
          dataKey="count"
          barSize={20}
          radius={[0, 4, 4, 0]}
          fill="var(--chart-1)"
        >
          <LabelList
            dataKey="endLabel"
            position="right"
            fill="var(--muted-foreground)"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
