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

/** 我提交過的建議（含審核狀態與群組名）。 */
export async function listMySuggestions(): Promise<
  (TagSuggestionRow & { group_name: string | null })[]
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('tag_suggestions')
    .select('*, groups(name)')
    .eq('user_id', user.id) // RLS 也會回「我是建立者」的群組提交，這裡只列自己的
    .order('created_at', { ascending: false })

  if (error) throw new Error(`讀取提交紀錄失敗：${error.message}`)
  return data.map(({ groups, ...row }) => ({
    ...row,
    group_name: groups?.name ?? null,
  }))
}

export type GroupTag = { id: string; name: string; group_id: string }

/** 各群組的群組標籤（RLS：成員可見；刪除權在建立者）。 */
export async function listGroupTags(): Promise<GroupTag[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flavor_tags')
    .select('id, name, group_id')
    .eq('scope', 'group')
    .order('name')

  if (error) throw new Error(`讀取群組標籤失敗：${error.message}`)
  return data.filter((t) => t.group_id !== null) as GroupTag[]
}

export type PendingSuggestion = {
  id: string
  name: string
  group_id: string
  submitter: string
}

/**
 * 待審核的提交（status=pending）。RLS 回「我提交的＋我管理的群組收到的」
 * （FR-10.12 副組長可審）；頁面依 group_id 過濾、僅管理者顯示審核 UI。
 */
export async function listPendingSuggestions(): Promise<PendingSuggestion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tag_suggestions')
    .select('id, name, group_id, user_id, profiles(username)')
    .eq('status', 'pending')
    .order('created_at')

  if (error) throw new Error(`讀取待審提交失敗：${error.message}`)
  return data
    .filter((row) => row.group_id !== null)
    .map((row) => ({
      id: row.id,
      name: row.name,
      group_id: row.group_id as string,
      submitter: row.profiles?.username ?? '（成員）',
    }))
}
