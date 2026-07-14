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

/**
 * 器材清單依類別分組。預設只回已核可的（供沖煮表單，FR-10.9b）；
 * personalOnly 只回個人的（供設定頁，群組器材改在群組卡片管理）。
 */
export async function listEquipment(opts?: {
  personalOnly?: boolean
}): Promise<Record<EquipmentKind, EquipmentRow[]>> {
  const supabase = await createClient()
  let query = supabase
    .from('equipment')
    .select('*, groups(name)')
    .order('created_at')
  query = opts?.personalOnly
    ? query.is('group_id', null)
    : query.eq('status', 'approved')

  const { data, error } = await query
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
