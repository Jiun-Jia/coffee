import { createClient } from '@/lib/supabase/server'

export type GroupMember = { user_id: string; username: string }
export type MyGroup = {
  id: string
  name: string
  owner_id: string
  invite_code: string
  isOwner: boolean
  members: GroupMember[]
}

/** 我的群組（RLS：擁有或加入的），含成員名單（同群組成員名稱可讀）。 */
export async function listMyGroups(): Promise<MyGroup[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('groups')
    .select('id, name, owner_id, invite_code, group_members(user_id, profiles(username))')
    .order('created_at')

  if (error) throw new Error(`讀取群組失敗：${error.message}`)

  return data.map((g) => ({
    id: g.id,
    name: g.name,
    owner_id: g.owner_id,
    invite_code: g.invite_code,
    isOwner: g.owner_id === user.id,
    members: g.group_members.map((m) => ({
      user_id: m.user_id,
      username: m.profiles?.username ?? '（未知）',
    })),
  }))
}
