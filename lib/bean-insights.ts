/**
 * FR-19 規則式調整建議（INS-1）：對單一豆子「我的」有評分沖煮做
 * 三維度分桶比較（水溫 2°C／粉水比 0.5 級距／同磨豆機刻度），
 * 純 SQL 聚合等級的規則，不用 AI。
 * 防小樣本誤導：**兩側樣本各 ≥ 3 且平均差 ≥ 0.5 分**才產生，
 * 最多 3 則、按差距排序（FR-19.2/19.3）。
 */

export type InsightBrew = {
  waterTemp: number | null
  ratioValue: number | null
  grinderId: string | null
  grinderName: string | null
  grindSetting: string | null
  overall: number
}

export type Insight = {
  text: string
  /** 差距（排序用） */
  diff: number
}

const MIN_SAMPLES = 3
const MIN_DIFF = 0.5
const MAX_INSIGHTS = 3

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * 通用分桶比較：最高平均的桶（n ≥ 3）vs 其餘全部（n ≥ 3），
 * 差 ≥ 0.5 分才回報。
 */
function bucketInsight(
  entries: { bucket: string; overall: number }[],
  describe: (bucket: string) => string,
  restLabel: string,
): Insight | null {
  const byBucket = new Map<string, number[]>()
  for (const e of entries) {
    const list = byBucket.get(e.bucket) ?? []
    list.push(e.overall)
    byBucket.set(e.bucket, list)
  }

  let best: { bucket: string; scores: number[] } | null = null
  for (const [bucket, scores] of byBucket) {
    if (scores.length < MIN_SAMPLES) continue
    if (!best || avg(scores) > avg(best.scores)) best = { bucket, scores }
  }
  if (!best) return null

  const rest = entries
    .filter((e) => e.bucket !== best.bucket)
    .map((e) => e.overall)
  if (rest.length < MIN_SAMPLES) return null

  const diff = avg(best.scores) - avg(rest)
  if (diff < MIN_DIFF) return null

  return {
    text: `${describe(best.bucket)}的平均喜好度 ★${round1(avg(best.scores))}，比${restLabel}高 ${round1(diff)} 分（${best.scores.length} vs ${rest.length} 杯）`,
    diff,
  }
}

export function beanInsights(brews: InsightBrew[]): Insight[] {
  const insights: Insight[] = []

  // 1) 水溫：2°C 分桶
  const tempInsight = bucketInsight(
    brews
      .filter((b) => b.waterTemp != null)
      .map((b) => ({
        bucket: String(Math.floor(b.waterTemp! / 2) * 2),
        overall: b.overall,
      })),
    (bucket) => `水溫 ${bucket}–${Number(bucket) + 1}°C `,
    '其他水溫',
  )
  if (tempInsight) insights.push(tempInsight)

  // 2) 粉水比：0.5 級距
  const ratioInsight = bucketInsight(
    brews
      .filter((b) => b.ratioValue != null)
      .map((b) => ({
        bucket: (Math.floor(b.ratioValue! / 0.5) * 0.5).toFixed(1),
        overall: b.overall,
      })),
    (bucket) => `粉水比 1:${bucket}–${(Number(bucket) + 0.5).toFixed(1)} `,
    '其他比例',
  )
  if (ratioInsight) insights.push(ratioInsight)

  // 3) 刻度：僅同一台磨豆機內比較（FR-3.9 不跨機）
  const byGrinder = new Map<string, InsightBrew[]>()
  for (const b of brews) {
    if (!b.grinderId || !b.grindSetting) continue
    const list = byGrinder.get(b.grinderId) ?? []
    list.push(b)
    byGrinder.set(b.grinderId, list)
  }
  for (const list of byGrinder.values()) {
    const grinderName = list[0].grinderName ?? '磨豆機'
    const insight = bucketInsight(
      list.map((b) => ({ bucket: b.grindSetting!, overall: b.overall })),
      (bucket) => `${grinderName} 刻度 ${bucket} `,
      '其他刻度',
    )
    if (insight) insights.push(insight)
  }

  return insights.sort((a, b) => b.diff - a.diff).slice(0, MAX_INSIGHTS)
}
