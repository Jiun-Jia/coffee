import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export type GrinderRow = Database['public']['Tables']['grinders']['Row']
export type GrinderWithCount = GrinderRow & {
  brew_count: number
  group_name: string | null
}

/** 磨豆機清單（含使用筆數與群組名）。RLS：本人的＋所屬群組的（FR-10.9）。 */
export async function listGrinders(): Promise<GrinderWithCount[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('grinders')
    .select('*, brews(count), groups(name)')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`讀取磨豆機失敗：${error.message}`)
  return data.map(({ brews, groups, ...grinder }) => ({
    ...grinder,
    brew_count: brews[0]?.count ?? 0,
    group_name: groups?.name ?? null,
  }))
}
