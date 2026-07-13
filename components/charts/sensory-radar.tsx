'use client'

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { ChartTooltipFrame } from '@/components/charts/chart-tooltip'

/** A5：八維感官（PRD §9 — 七項感官＋整體喜好度） */
const DIMENSIONS = [
  { key: 'aroma', label: '香氣' },
  { key: 'acidity', label: '酸質' },
  { key: 'sweetness', label: '甜感' },
  { key: 'bitterness', label: '苦味' },
  { key: 'body', label: '口感' },
  { key: 'balance', label: '平衡' },
  { key: 'aftertaste', label: '餘韻' },
  { key: 'overall', label: '整體' },
] as const

export type RadarSeries = {
  id: string
  label: string
  /** 未評分的維度為 null（畫為 0 會誤導 → 以 null 斷點） */
  scores: Record<(typeof DIMENSIONS)[number]['key'], number | null>
}

const SLOT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

/**
 * 感官雷達（單筆或疊加，上限 5 筆）。
 * series[i].slot 對應固定色槽（顏色跟隨實體，移除一筆不重繪其他筆）。
 */
export function SensoryRadar({
  series,
  height = 280,
}: {
  series: (RadarSeries & { slot?: number })[]
  height?: number
}) {
  if (series.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        尚無可顯示的評分資料
      </p>
    )
  }

  const data = DIMENSIONS.map((dim) => {
    const row: Record<string, string | number | null> = { dim: dim.label }
    for (const s of series) row[s.id] = s.scores[dim.key]
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid stroke="var(--border)" strokeWidth={1} />
        <PolarAngleAxis
          dataKey="dim"
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
        />
        <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
        {series.map((s, i) => {
          const color = SLOT_COLORS[(s.slot ?? i) % SLOT_COLORS.length]
          return (
            <Radar
              key={s.id}
              name={s.label}
              dataKey={s.id}
              stroke={color}
              strokeWidth={2}
              fill={color}
              fillOpacity={0.1}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
            />
          )
        })}
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <ChartTooltipFrame
                title={String(label)}
                rows={payload.map((p) => ({
                  label: String(p.name),
                  value: p.value != null ? `${p.value} / 5` : '未評分',
                  color: String(p.color),
                }))}
              />
            )
          }}
        />
        {series.length > 1 && (
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => (
              <span className="text-muted-foreground">{value}</span>
            )}
          />
        )}
      </RadarChart>
    </ResponsiveContainer>
  )
}
