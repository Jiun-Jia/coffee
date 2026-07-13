'use client'

import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChartTooltipFrame } from '@/components/charts/chart-tooltip'

export type ScatterBrew = {
  id: string
  label: string // tooltip 標題（日期＋豆名）
  overall: number
  water_temp: number | null
  ratio_value: number | null
  water_g: number | null
  grind_setting: string | null
  grinder_id: string | null
  grinder_name: string | null
}

type AxisKey = 'water_temp' | 'ratio_value' | 'water_g' | 'grind'

const AXES: { value: AxisKey; label: string }[] = [
  { value: 'water_temp', label: '水溫（°C）' },
  { value: 'ratio_value', label: '粉水比（1:N）' },
  { value: 'water_g', label: '水量（g）' },
  { value: 'grind', label: '刻度' },
]

/** 刻度自由文字 → 數值（取第一段數字；解析失敗回 null 並計入排除數） */
function parseGrind(setting: string | null): number | null {
  if (!setting) return null
  const m = /(\d+(?:\.\d+)?)/.exec(setting)
  return m ? Number.parseFloat(m[1]) : null
}

/**
 * A2 喜好度 vs 變因散點：X 軸可切換。
 * 刻度軸強制先選單一磨豆機（FR-3.9：不同磨豆機的刻度不可比），
 * 無法解析的刻度顯示排除筆數而非默默消失。
 */
export function VariableScatter({
  brews,
  height = 260,
}: {
  brews: ScatterBrew[]
  height?: number
}) {
  const [axis, setAxis] = useState<AxisKey>('water_temp')
  const [grinderId, setGrinderId] = useState<string>('')

  const grinders = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of brews) {
      if (b.grinder_id && b.grinder_name) map.set(b.grinder_id, b.grinder_name)
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [brews])

  const { points, excluded } = useMemo(() => {
    if (axis === 'grind') {
      if (!grinderId) return { points: [], excluded: 0 }
      const candidates = brews.filter((b) => b.grinder_id === grinderId)
      const pts = []
      let skipped = 0
      for (const b of candidates) {
        const x = parseGrind(b.grind_setting)
        if (x === null) skipped++
        else pts.push({ x, y: b.overall, label: b.label })
      }
      return { points: pts, excluded: skipped }
    }
    const pts = brews
      .filter((b) => b[axis] != null)
      .map((b) => ({ x: b[axis] as number, y: b.overall, label: b.label }))
    return { points: pts, excluded: 0 }
  }, [brews, axis, grinderId])

  const axisLabel = AXES.find((a) => a.value === axis)?.label ?? ''

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Select value={axis} onValueChange={(v) => setAxis(v as AxisKey)}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AXES.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                X：{a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {axis === 'grind' && (
          <Select value={grinderId} onValueChange={setGrinderId}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue placeholder="選擇磨豆機（必選）" />
            </SelectTrigger>
            <SelectContent>
              {grinders.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {axis === 'grind' && !grinderId ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          刻度因磨豆機而異，請先選擇一台磨豆機再比較
        </p>
      ) : points.length < 2 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          此變因的資料不足（至少 2 筆）
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: -20 }}>
              <XAxis
                type="number"
                dataKey="x"
                domain={['auto', 'auto']}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                label={{
                  value: axisLabel,
                  position: 'insideBottomRight',
                  offset: -2,
                  fontSize: 11,
                  fill: 'var(--muted-foreground)',
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
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
                  const d = payload[0].payload as (typeof points)[number]
                  return (
                    <ChartTooltipFrame
                      title={d.label}
                      rows={[
                        { label: axisLabel, value: String(d.x) },
                        { label: '喜好度', value: `★${d.y}` },
                      ]}
                    />
                  )
                }}
              />
              <Scatter
                data={points}
                fill="var(--chart-1)"
                stroke="var(--card)"
                strokeWidth={2}
              />
            </ScatterChart>
          </ResponsiveContainer>
          {excluded > 0 && (
            <p className="text-muted-foreground text-center text-xs">
              {excluded} 筆刻度無法解析為數值，未納入圖中
            </p>
          )}
        </>
      )}
    </div>
  )
}
