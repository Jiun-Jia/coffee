'use client'

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltipFrame } from '@/components/charts/chart-tooltip'

export type MonthlyCost = { month: string; total: number }

/** FR-18.3 每月豆子花費（依登錄月≈購入月，近 12 個月）。單量值單軸。 */
export function CostChart({ monthly }: { monthly: MonthlyCost[] }) {
  if (monthly.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        還沒有填了價格的豆子。到豆子表單補上「價格」就能追蹤花費。
      </p>
    )
  }

  const data = monthly.map((m) => ({
    ...m,
    label: `${Number(m.month.slice(5, 7))}月`,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: 'var(--muted)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as (typeof data)[number]
            return (
              <ChartTooltipFrame
                title={d.month}
                rows={[{ label: '豆子花費', value: `NT$ ${d.total}` }]}
              />
            )
          }}
        />
        <Bar
          dataKey="total"
          barSize={28}
          radius={[4, 4, 0, 0]}
          fill="var(--chart-1)"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
