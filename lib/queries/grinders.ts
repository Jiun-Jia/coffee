import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export type GrinderRow = Database['public']['Tables']['grinders']['Row']
export type GrinderWithCount = GrinderRow & { brew_count: number }

/** 磨豆機清單（含使用筆數，供刪除警示），RLS 限定本人。 */
export async function listGrinders(): Promise<GrinderWithCount[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('grinders')
    .select('*, brews(count)')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`讀取磨豆機失敗：${error.message}`)
  return data.map(({ brews, ...grinder }) => ({
    ...grinder,
    brew_count: brews[0]?.count ?? 0,
  }))
}
