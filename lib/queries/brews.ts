import { createClient } from '@/lib/supabase/server'
import type { RoastLevel } from '@/lib/validations/enums'
import type { Database } from '@/types/database'

export type BrewDetailRow = Database['public']['Views']['brew_details']['Row']
export type FlavorTag = Pick<
  Database['public']['Tables']['flavor_tags']['Row'],
  'id' | 'name' | 'category'
>

/** P3 篩選參數（FR-7.1/7.2/7.3），與 URL searchParams 一一對應 */
export type BrewFilters = {
  q?: string
  beanId?: string
  roastLevel?: RoastLevel
  origin?: string
  process?: string
  roaster?: string
  dripper?: string
  tagId?: string
  minOverall?: number
  from?: string // YYYY-MM-DD
  to?: string
  sort?: 'brewed_at' | 'overall'
  dir?: 'asc' | 'desc'
}

/** ilike 樣式跳脫（%、_）並移除會破壞 .or() 語法的字元 */
function likePattern(q: string) {
  return `%${q.replace(/[%_]/g, '\\$&').replace(/[(),]/g, ' ')}%`
}

/** 沖煮列表（讀 brew_details view，BREW-11：FR-7 全參數）。 */
export async function listBrews(
  filters: BrewFilters = {},
): Promise<BrewDetailRow[]> {
  const supabase = await createClient()

  // 標籤篩選：兩段查詢（先取有掛該標籤的 brew ids）
  let tagBrewIds: string[] | null = null
  if (filters.tagId) {
    const { data, error } = await supabase
      .from('brew_flavor_tags')
      .select('brew_id')
      .eq('tag_id', filters.tagId)
    if (error) throw new Error(`讀取標籤篩選失敗：${error.message}`)
    tagBrewIds = data.map((r) => r.brew_id)
    if (tagBrewIds.length === 0) return []
  }

  // 每頁重建查詢（builder 不宜重複執行）
  const buildQuery = () => {
    let query = supabase.from('brew_details').select('*')

    if (tagBrewIds) query = query.in('id', tagBrewIds)
    if (filters.beanId) query = query.eq('bean_id', filters.beanId)
    if (filters.roastLevel) query = query.eq('roast_level', filters.roastLevel)
    if (filters.origin) query = query.eq('origin', filters.origin)
    if (filters.process) query = query.eq('process', filters.process)
    if (filters.roaster) query = query.eq('roaster', filters.roaster)
    if (filters.dripper) query = query.eq('dripper', filters.dripper)
    if (filters.minOverall) query = query.gte('overall', filters.minOverall)
    // 日期區間以台北時區為口徑（與 rest_days 一致）
    if (filters.from)
      query = query.gte('brewed_at', `${filters.from}T00:00:00+08:00`)
    if (filters.to)
      query = query.lte('brewed_at', `${filters.to}T23:59:59+08:00`)
    if (filters.q) {
      const p = likePattern(filters.q)
      query = query.or(
        `name_batch.ilike.${p},roaster.ilike.${p},notes.ilike.${p}`,
      )
    }

    const sort = filters.sort ?? 'brewed_at'
    const ascending = filters.dir === 'asc'
    query = query.order(sort, { ascending })
    if (sort !== 'brewed_at') {
      query = query.order('brewed_at', { ascending: false }) // 次序穩定
    }
    return query
  }

  // 分批抓全量（原本 limit 500 會讓分析頁默默漏算舊資料）。
  // D15：列表不分頁；安全上限 5000 筆防呆，超過時最舊的會被截斷。
  const rows: BrewDetailRow[] = []
  const PAGE = 500
  const MAX = 5000
  for (let fromIdx = 0; fromIdx < MAX; fromIdx += PAGE) {
    const { data, error } = await buildQuery().range(
      fromIdx,
      fromIdx + PAGE - 1,
    )
    if (error) throw new Error(`讀取沖煮紀錄失敗：${error.message}`)
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

/** 濾杯下拉選項：使用者用過的濾杯（distinct） */
export async function listDistinctDrippers(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brews')
    .select('dripper')
    .not('dripper', 'is', null)

  if (error) throw new Error(`讀取濾杯選項失敗：${error.message}`)
  return [...new Set(data.map((r) => r.dripper).filter(Boolean))] as string[]
}

export async function getBrew(id: string): Promise<BrewDetailRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brew_details')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`讀取沖煮紀錄失敗：${error.message}`)
  return data
}

export type BrewPour = {
  seq: number
  end_time_sec: number | null
  cumulative_water_g: number | null
  note: string | null
}

/** 該筆沖煮的注水分段（FR-11），依段序排列。 */
export async function getBrewPours(brewId: string): Promise<BrewPour[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brew_pours')
    .select('seq, end_time_sec, cumulative_water_g, note')
    .eq('brew_id', brewId)
    .order('seq')

  if (error) throw new Error(`讀取注水分段失敗：${error.message}`)
  return data
}

/** 該筆沖煮掛的風味標籤。 */
export async function getBrewTags(brewId: string): Promise<FlavorTag[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brew_flavor_tags')
    .select('flavor_tags(id, name, category)')
    .eq('brew_id', brewId)

  if (error) throw new Error(`讀取風味標籤失敗：${error.message}`)
  return data.map((row) => row.flavor_tags).filter(Boolean)
}
