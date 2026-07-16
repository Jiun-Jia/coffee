import { createClient } from '@/lib/supabase/server'
import type { BrewDetailRow } from '@/lib/queries/brews'
import type { TagStat } from '@/components/charts/tag-stats-chart'

/**
 * A4 標籤統計：從「已套用篩選的沖煮」聚合各標籤出現次數與平均喜好度。
 * 以傳入的 brews 為準（與 P9 其他圖表口徑一致），分批 .in() 避免 URL 過長。
 */
export async function fetchTagStats(
  brews: BrewDetailRow[],
): Promise<TagStat[]> {
  const overallByBrew = new Map<string, number>()
  for (const b of brews) {
    if (b.id && b.overall != null) overallByBrew.set(b.id, b.overall)
  }
  const ids = [...overallByBrew.keys()]
  if (ids.length === 0) return []

  const supabase = await createClient()
  const rows: {
    brew_id: string
    tag: { id: string; name: string; category: string | null } | null
  }[] = []
  const CHUNK = 100
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await supabase
      .from('brew_flavor_tags')
      .select('brew_id, tag:flavor_tags(id, name, category)')
      .in('brew_id', ids.slice(i, i + CHUNK))
    if (error) throw new Error(`讀取標籤統計失敗：${error.message}`)
    rows.push(...data)
  }

  const agg = new Map<
    string,
    { name: string; category: string | null; count: number; sum: number }
  >()
  for (const row of rows) {
    if (!row.tag) continue
    const overall = overallByBrew.get(row.brew_id)
    if (overall == null) continue
    const entry = agg.get(row.tag.id) ?? {
      name: row.tag.name,
      category: row.tag.category,
      count: 0,
      sum: 0,
    }
    entry.count += 1
    entry.sum += overall
    agg.set(row.tag.id, entry)
  }

  // 全量回傳（FR-21 風味輪要看整體分佈）；長條圖自行取前 15
  return [...agg.entries()]
    .map(([id, { name, category, count, sum }]) => ({
      id,
      name,
      category,
      count,
      avgOverall: Math.round((sum / count) * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count || b.avgOverall - a.avgOverall)
}

// ============ FR-18.3 消費統計（COST-2；僅計個人） ============

export type CostStats = {
  /** 每月豆子花費（依「登錄豆子」的月份 ≈ 購入月；近 12 個月） */
  monthly: { month: string; total: number }[]
  /** 平均每杯成本（我沖的、且豆子有價格＋購入重量的杯） */
  avgCupCost: number | null
  cupCount: number
}

/** 月份鍵：以台北時區取 YYYY-MM（與 rest_days 同時區口徑） */
function taipeiMonth(iso: string): string {
  return new Date(new Date(iso).getTime() + 8 * 3_600_000)
    .toISOString()
    .slice(0, 7)
}

export async function fetchCostStats(uid: string): Promise<CostStats> {
  const supabase = await createClient()
  const [beansRes, brewsRes] = await Promise.all([
    // 我買的豆（含掛到群組的）：價格記在建立者身上
    supabase
      .from('beans')
      .select('price, created_at')
      .eq('user_id', uid)
      .not('price', 'is', null),
    // 我的沖煮 × 豆子價格/重量（FR-18.4 成本僅計個人沖煮所耗）
    supabase
      .from('brews')
      .select('dose_g, beans!inner(price, purchase_weight_g)')
      .eq('user_id', uid)
      .not('beans.price', 'is', null)
      .not('beans.purchase_weight_g', 'is', null),
  ])
  if (beansRes.error)
    throw new Error(`讀取消費統計失敗：${beansRes.error.message}`)
  if (brewsRes.error)
    throw new Error(`讀取消費統計失敗：${brewsRes.error.message}`)

  const byMonth = new Map<string, number>()
  for (const bean of beansRes.data) {
    const month = taipeiMonth(bean.created_at)
    byMonth.set(month, (byMonth.get(month) ?? 0) + (bean.price ?? 0))
  }
  const monthly = [...byMonth.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)

  const costs = brewsRes.data
    .map((b) =>
      b.beans.price != null &&
      b.beans.purchase_weight_g != null &&
      b.beans.purchase_weight_g > 0
        ? (b.beans.price * b.dose_g) / b.beans.purchase_weight_g
        : null,
    )
    .filter((c): c is number => c != null)

  return {
    monthly,
    avgCupCost:
      costs.length > 0
        ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length)
        : null,
    cupCount: costs.length,
  }
}
