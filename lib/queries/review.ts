import { fetchTagStats } from '@/lib/queries/analytics'
import { listBrews, type BrewDetailRow } from '@/lib/queries/brews'

/**
 * FR-20 沖煮回顧（RVW-1）：月/年期間的個人統計。
 * 期間界線一律台北時區（與 rest_days 同口徑）；上期供標籤偏好對比。
 */

export type ReviewPeriod = 'month' | 'year'

export type ReviewStats = {
  periodLabel: string
  prevLabel: string
  cupCount: number
  totalDoseG: number
  beanCount: number
  avgOverall: number | null
  best: { id: string; label: string; overall: number } | null
  /** 喜好度走勢（月＝逐日、年＝逐月），僅含有評分的桶 */
  trend: { label: string; avg: number; count: number }[]
  /** 本期前 5 標籤與上期次數差 */
  tags: { name: string; count: number; delta: number; avgOverall: number }[]
}

function taipeiParts(date: Date) {
  const t = new Date(date.getTime() + 8 * 3_600_000)
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

function boundaries(period: ReviewPeriod) {
  const { y, m } = taipeiParts(new Date())
  const pad = (n: number) => String(n).padStart(2, '0')
  if (period === 'month') {
    const prevY = m === 1 ? y - 1 : y
    const prevM = m === 1 ? 12 : m - 1
    return {
      start: new Date(`${y}-${pad(m)}-01T00:00:00+08:00`),
      prevStart: new Date(`${prevY}-${pad(prevM)}-01T00:00:00+08:00`),
      periodLabel: `${y} 年 ${m} 月`,
      prevLabel: '上月',
    }
  }
  return {
    start: new Date(`${y}-01-01T00:00:00+08:00`),
    prevStart: new Date(`${y - 1}-01-01T00:00:00+08:00`),
    periodLabel: `${y} 年`,
    prevLabel: '去年',
  }
}

function trendBuckets(
  brews: BrewDetailRow[],
  period: ReviewPeriod,
): ReviewStats['trend'] {
  const buckets = new Map<number, { sum: number; count: number }>()
  for (const b of brews) {
    if (!b.brewed_at || b.overall == null) continue
    const { m, d } = taipeiParts(new Date(b.brewed_at))
    const key = period === 'month' ? d : m
    const entry = buckets.get(key) ?? { sum: 0, count: 0 }
    entry.sum += b.overall
    entry.count += 1
    buckets.set(key, entry)
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, { sum, count }]) => ({
      label: period === 'month' ? `${key}日` : `${key}月`,
      avg: Math.round((sum / count) * 10) / 10,
      count,
    }))
}

export async function fetchReviewStats(
  uid: string,
  period: ReviewPeriod,
): Promise<ReviewStats> {
  const { start, prevStart, periodLabel, prevLabel } = boundaries(period)
  const mine = (await listBrews()).filter((b) => b.user_id === uid)

  const inPeriod = mine.filter(
    (b) => b.brewed_at && new Date(b.brewed_at) >= start,
  )
  const inPrev = mine.filter(
    (b) =>
      b.brewed_at &&
      new Date(b.brewed_at) >= prevStart &&
      new Date(b.brewed_at) < start,
  )

  const scores = inPeriod
    .map((b) => b.overall)
    .filter((n): n is number => n != null)
  const best = inPeriod
    .filter((b) => b.id && b.overall != null)
    .sort(
      (a, b) =>
        (b.overall ?? 0) - (a.overall ?? 0) ||
        (b.brewed_at ?? '').localeCompare(a.brewed_at ?? ''),
    )[0]

  const [curTags, prevTags] = await Promise.all([
    fetchTagStats(inPeriod),
    fetchTagStats(inPrev),
  ])
  const prevCount = new Map(prevTags.map((t) => [t.id, t.count]))

  return {
    periodLabel,
    prevLabel,
    cupCount: inPeriod.length,
    totalDoseG: Math.round(
      inPeriod.reduce((sum, b) => sum + (b.dose_g ?? 0), 0),
    ),
    beanCount: new Set(inPeriod.map((b) => b.bean_id).filter(Boolean)).size,
    avgOverall:
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
          10
        : null,
    best: best
      ? {
          id: best.id!,
          label: `${best.brewed_at?.slice(0, 10)} ${best.name_batch}`,
          overall: best.overall!,
        }
      : null,
    trend: trendBuckets(inPeriod, period),
    tags: curTags.slice(0, 5).map((t) => ({
      name: t.name,
      count: t.count,
      delta: t.count - (prevCount.get(t.id) ?? 0),
      avgOverall: t.avgOverall,
    })),
  }
}
