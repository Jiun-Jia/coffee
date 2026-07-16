'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltipFrame } from '@/components/charts/chart-tooltip'
import type { TagStat } from '@/components/charts/tag-stats-chart'

/**
 * FR-21 風味輪（WHL-1）：雙層環形——內圈＝風味輪分類、外圈＝標籤；
 * 角度＝出現次數、顏色深淺＝平均喜好度（淡＝低分、飽和＝高分）。
 *
 * 色彩設計（dataviz 六檢查，2026-07-16 validate_palette 驗證）：
 * - 分類色**固定跟隨分類實體**（語意近似真實 SCA 風味輪），不隨篩選重排；
 * - 淺色模式全項通過；金黃（熱帶水果）對比為 WARN、深色模式微亮於帶——
 *   以下方分類圖例＋逐段 tooltip＋「長條」切換（等同表格檢視）補償，
 *   身分永不只靠顏色；
 * - 段間 2px 背景色縫（spacer）；深淺以 color-mix 混向 --background，
 *   自動適配深淺主題。
 */
const CATEGORY_COLORS: Record<string, string> = {
  花香: '#c96fb4',
  莓果: '#cc4b5e',
  柑橘: '#d06a1f',
  '核果/水果': '#cf7442',
  熱帶水果: '#cba32d',
  堅果: '#b07f3f',
  '巧克力/可可': '#96491c',
  '焦糖/甜香': '#a97f2e',
  香料: '#a34f3e',
  '發酵/酒香': '#8f5fae',
  '茶感/草本': '#479a58',
  '烘焙/焦香': '#3d7fb8',
}
const OTHER_KEY = '其他'
const OTHER_COLOR = '#64748b'

function categoryKey(category: string | null): string {
  return category && category in CATEGORY_COLORS ? category : OTHER_KEY
}

function baseColor(key: string): string {
  return CATEGORY_COLORS[key] ?? OTHER_COLOR
}

/** 深淺＝平均喜好度：★1 → 38% 淡、★5 → 全色（混向背景，主題自適應） */
function shadeByOverall(base: string, avgOverall: number): string {
  const clamped = Math.min(5, Math.max(1, avgOverall))
  const strength = Math.round(38 + ((clamped - 1) / 4) * 62)
  return strength >= 100
    ? base
    : `color-mix(in oklab, ${base} ${strength}%, var(--background))`
}

export function FlavorWheel({ stats }: { stats: TagStat[] }) {
  if (stats.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        還沒有掛上風味標籤的沖煮
      </p>
    )
  }

  // 內圈：分類彙總，照風味輪固定順序（顏色與位置跟隨實體，不隨篩選重排）
  const order = [...Object.keys(CATEGORY_COLORS), OTHER_KEY]
  const byCategory = new Map<string, { count: number; sum: number }>()
  for (const s of stats) {
    const key = categoryKey(s.category)
    const entry = byCategory.get(key) ?? { count: 0, sum: 0 }
    entry.count += s.count
    entry.sum += s.avgOverall * s.count
    byCategory.set(key, entry)
  }
  const categories = order
    .filter((key) => byCategory.has(key))
    .map((key) => {
      const { count, sum } = byCategory.get(key)!
      return {
        key,
        count,
        avgOverall: Math.round((sum / count) * 10) / 10,
        fill: baseColor(key),
      }
    })

  // 外圈：標籤照「所屬分類順序 → 次數」排列，角度總和與內圈對齊
  const catIndex = new Map(categories.map((c, i) => [c.key, i]))
  const tags = [...stats]
    .map((s) => ({ ...s, catKey: categoryKey(s.category) }))
    .sort(
      (a, b) =>
        (catIndex.get(a.catKey) ?? 99) - (catIndex.get(b.catKey) ?? 99) ||
        b.count - a.count,
    )
    .map((s) => ({
      ...s,
      fill: shadeByOverall(baseColor(s.catKey), s.avgOverall),
    }))

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as {
                key?: string
                name?: string
                catKey?: string
                count: number
                avgOverall: number
              }
              return (
                <ChartTooltipFrame
                  title={d.name ?? d.key ?? ''}
                  rows={[
                    ...(d.name ? [{ label: '分類', value: d.catKey ?? '' }] : []),
                    { label: '出現次數', value: `${d.count} 次` },
                    { label: '平均喜好度', value: `★${d.avgOverall}` },
                  ]}
                />
              )
            }}
          />
          {/* 內圈：分類（全色） */}
          <Pie
            data={categories}
            dataKey="count"
            nameKey="key"
            startAngle={90}
            endAngle={-270}
            innerRadius="26%"
            outerRadius="55%"
            cornerRadius={3}
            stroke="var(--background)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {categories.map((c) => (
              <Cell key={c.key} fill={c.fill} />
            ))}
          </Pie>
          {/* 外圈：標籤（深淺＝平均喜好度） */}
          <Pie
            data={tags}
            dataKey="count"
            nameKey="name"
            startAngle={90}
            endAngle={-270}
            innerRadius="60%"
            outerRadius="88%"
            cornerRadius={3}
            stroke="var(--background)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {tags.map((t) => (
              <Cell key={t.id} fill={t.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* 分類圖例（身分不只靠顏色；hover 各段有 tooltip） */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {categories.map((c) => (
          <span
            key={c.key}
            className="text-muted-foreground inline-flex items-center gap-1 text-xs"
          >
            <span
              className="inline-block size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: c.fill }}
            />
            {c.key}（{c.count}）
          </span>
        ))}
      </div>
    </div>
  )
}
