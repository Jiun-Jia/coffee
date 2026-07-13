import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export type EquipmentRow = Database['public']['Tables']['equipment']['Row']
export type EquipmentKind = Database['public']['Enums']['equipment_kind']

export const EQUIPMENT_KIND_LABELS: Record<EquipmentKind, string> = {
  dripper: '濾杯',
  filter: '濾紙',
  kettle: '手沖壺',
}

/** 我的器材清單（RLS 限本人），依類別分組供設定頁與沖煮表單下拉。 */
export async function listEquipment(): Promise<
  Record<EquipmentKind, EquipmentRow[]>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .order('created_at')

  if (error) throw new Error(`讀取器材失敗：${error.message}`)

  const grouped: Record<EquipmentKind, EquipmentRow[]> = {
    dripper: [],
    filter: [],
    kettle: [],
  }
  for (const item of data) grouped[item.kind].push(item)
  return grouped
}
