import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export type BeanRow = Database['public']['Tables']['beans']['Row']
export type BeanWithCount = BeanRow & { brew_count: number }
export type BrewDetailRow = Database['public']['Views']['brew_details']['Row']

/** 豆子列表（含沖煮筆數），RLS 自動限定本人資料。 */
export async function listBeans(): Promise<BeanWithCount[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('beans')
    .select('*, brews(count)')
    .order('roast_date', { ascending: false })

  if (error) throw new Error(`讀取豆子列表失敗：${error.message}`)
  return data.map(({ brews, ...bean }) => ({
    ...bean,
    brew_count: brews[0]?.count ?? 0,
  }))
}

export async function getBean(id: string): Promise<BeanRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('beans')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`讀取豆子失敗：${error.message}`)
  return data
}

/** 該豆的所有沖煮（讀 brew_details view，含 rest_days / ratio_value）。 */
export async function getBeanBrews(beanId: string): Promise<BrewDetailRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brew_details')
    .select('*')
    .eq('bean_id', beanId)
    .order('brewed_at', { ascending: false })

  if (error) throw new Error(`讀取沖煮紀錄失敗：${error.message}`)
  return data
}
