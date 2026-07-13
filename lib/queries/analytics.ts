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
  const rows: { brew_id: string; tag: { id: string; name: string } | null }[] =
    []
  const CHUNK = 100
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await supabase
      .from('brew_flavor_tags')
      .select('brew_id, tag:flavor_tags(id, name)')
      .in('brew_id', ids.slice(i, i + CHUNK))
    if (error) throw new Error(`讀取標籤統計失敗：${error.message}`)
    rows.push(...data)
  }

  const agg = new Map<string, { name: string; count: number; sum: number }>()
  for (const row of rows) {
    if (!row.tag) continue
    const overall = overallByBrew.get(row.brew_id)
    if (overall == null) continue
    const entry = agg.get(row.tag.id) ?? { name: row.tag.name, count: 0, sum: 0 }
    entry.count += 1
    entry.sum += overall
    agg.set(row.tag.id, entry)
  }

  return [...agg.entries()]
    .map(([id, { name, count, sum }]) => ({
      id,
      name,
      count,
      avgOverall: Math.round((sum / count) * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count || b.avgOverall - a.avgOverall)
    .slice(0, 15) // 前 15 名（超出以表格/篩選檢視）
}
