import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export type BeanRow = Database['public']['Tables']['beans']['Row']
export type BeanWithCount = BeanRow & {
  brew_count: number
  group_name: string | null
  /** FR-15 庫存：全部可見沖煮的粉量加總／平均（bean_usage view） */
  total_dose_g: number | null
  avg_dose_g: number | null
}
export type BrewDetailRow = Database['public']['Views']['brew_details']['Row']

/** 豆子列表（含沖煮筆數、群組名與用量彙總）。RLS：本人的＋所屬群組的（FR-10.4）。 */
export async function listBeans(): Promise<BeanWithCount[]> {
  const supabase = await createClient()
  const [beansRes, usageRes] = await Promise.all([
    supabase
      .from('beans')
      .select('*, brews(count), groups(name)')
      .order('roast_date', { ascending: false }),
    supabase.from('bean_usage').select('*'),
  ])

  if (beansRes.error)
    throw new Error(`讀取豆子列表失敗：${beansRes.error.message}`)
  if (usageRes.error)
    throw new Error(`讀取豆子用量失敗：${usageRes.error.message}`)

  const usage = new Map(usageRes.data.map((u) => [u.bean_id, u]))
  return beansRes.data.map(({ brews, groups, ...bean }) => ({
    ...bean,
    brew_count: brews[0]?.count ?? 0,
    group_name: groups?.name ?? null,
    total_dose_g: usage.get(bean.id)?.total_dose_g ?? null,
    avg_dose_g: usage.get(bean.id)?.avg_dose_g ?? null,
  }))
}

export async function getBean(
  id: string,
): Promise<
  | (BeanRow & {
      group_name: string | null
      total_dose_g: number | null
      avg_dose_g: number | null
    })
  | null
> {
  const supabase = await createClient()
  const [beanRes, usageRes] = await Promise.all([
    supabase.from('beans').select('*, groups(name)').eq('id', id).maybeSingle(),
    supabase.from('bean_usage').select('*').eq('bean_id', id).maybeSingle(),
  ])

  if (beanRes.error) throw new Error(`讀取豆子失敗：${beanRes.error.message}`)
  if (!beanRes.data) return null
  const { groups, ...bean } = beanRes.data
  return {
    ...bean,
    group_name: groups?.name ?? null,
    total_dose_g: usageRes.data?.total_dose_g ?? null,
    avg_dose_g: usageRes.data?.avg_dose_g ?? null,
  }
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
