import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export type EquipmentRow = Database['public']['Tables']['equipment']['Row'] & {
  group_name: string | null
}
export type EquipmentKind = Database['public']['Enums']['equipment_kind']

export const EQUIPMENT_KIND_LABELS: Record<EquipmentKind, string> = {
  dripper: '濾杯',
  filter: '濾紙',
  kettle: '手沖壺',
}

/** 器材清單（本人的＋所屬群組的，FR-10.9），依類別分組。 */
export async function listEquipment(): Promise<
  Record<EquipmentKind, EquipmentRow[]>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('equipment')
    .select('*, groups(name)')
    .order('created_at')

  if (error) throw new Error(`讀取器材失敗：${error.message}`)

  const grouped: Record<EquipmentKind, EquipmentRow[]> = {
    dripper: [],
    filter: [],
    kettle: [],
  }
  for (const { groups, ...item } of data) {
    grouped[item.kind].push({ ...item, group_name: groups?.name ?? null })
  }
  return grouped
}
