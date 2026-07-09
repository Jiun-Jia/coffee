import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export type FlavorTagRow = Database['public']['Tables']['flavor_tags']['Row']
export type TagSuggestionRow =
  Database['public']['Tables']['tag_suggestions']['Row']

/** 可選用的風味標籤：RLS 自動回 system + 本人自訂（FR-5.1/5.3）。 */
export async function listFlavorTags(): Promise<FlavorTagRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flavor_tags')
    .select('*')
    .order('scope', { ascending: false }) // system 在前
    .order('category')
    .order('name')

  if (error) throw new Error(`讀取風味標籤失敗：${error.message}`)
  return data
}

export type MyTagWithCount = FlavorTagRow & { usage_count: number }

/** 我的自訂標籤（含使用筆數，供設定頁 BREW-17）。 */
export async function listMyTags(): Promise<MyTagWithCount[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flavor_tags')
    .select('*, brew_flavor_tags(count)')
    .eq('scope', 'user')
    .order('created_at')

  if (error) throw new Error(`讀取自訂標籤失敗：${error.message}`)
  return data.map(({ brew_flavor_tags, ...tag }) => ({
    ...tag,
    usage_count: brew_flavor_tags[0]?.count ?? 0,
  }))
}

/** 我提交過的建議（含審核狀態）。 */
export async function listMySuggestions(): Promise<TagSuggestionRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tag_suggestions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`讀取提交紀錄失敗：${error.message}`)
  return data
}
