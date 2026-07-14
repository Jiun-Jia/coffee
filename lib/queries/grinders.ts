import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export type GrinderRow = Database['public']['Tables']['grinders']['Row']
export type GrinderWithCount = GrinderRow & {
  brew_count: number
  group_name: string | null
}

/**
 * 磨豆機清單（含使用筆數與群組名）。RLS：本人的＋所屬群組的（FR-10.9）。
 * 預設只回已核可的（供沖煮表單）；personalOnly 只回個人的（供設定頁，
 * 群組磨豆機改在群組卡片管理，FR-10.9b）。
 */
export async function listGrinders(opts?: {
  personalOnly?: boolean
}): Promise<GrinderWithCount[]> {
  const supabase = await createClient()
  let query = supabase
    .from('grinders')
    .select('*, brews(count), groups(name)')
    .order('created_at', { ascending: true })
  query = opts?.personalOnly
    ? query.is('group_id', null)
    : query.eq('status', 'approved')

  const { data, error } = await query
  if (error) throw new Error(`讀取磨豆機失敗：${error.message}`)
  return data.map(({ brews, groups, ...grinder }) => ({
    ...grinder,
    brew_count: brews[0]?.count ?? 0,
    group_name: groups?.name ?? null,
  }))
}
