import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export type BrewDetailRow = Database['public']['Views']['brew_details']['Row']
export type FlavorTag = Pick<
  Database['public']['Tables']['flavor_tags']['Row'],
  'id' | 'name' | 'category'
>

/** 沖煮列表（讀 brew_details view）。W4 的 BREW-11 再加完整篩選參數。 */
export async function listBrews(): Promise<BrewDetailRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brew_details')
    .select('*')
    .order('brewed_at', { ascending: false })
    .limit(200) // MVP 個人量級足夠；FR-7 完整篩選於 W4 實作

  if (error) throw new Error(`讀取沖煮紀錄失敗：${error.message}`)
  return data
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
