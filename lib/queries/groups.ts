import { createClient } from '@/lib/supabase/server'
import type { EquipmentKind } from '@/lib/queries/equipment'

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

// ============ FR-10.9b 群組共用器材（成員提案、建立者核可） ============

export type GroupGearKind = 'grinder' | EquipmentKind
export type GroupGearItem = {
  id: string
  gearKind: GroupGearKind
  name: string
  group_id: string
  user_id: string
  status: 'pending' | 'approved'
  submitter: string
}

/** 全部群組器材（含待審核，RLS 限所屬群組），供設定頁群組卡片管理。 */
export async function listGroupGear(): Promise<GroupGearItem[]> {
  const supabase = await createClient()
  const [grinders, equipment] = await Promise.all([
    supabase
      .from('grinders')
      .select('id, name, group_id, user_id, status, profiles(username)')
      .not('group_id', 'is', null)
      .order('created_at'),
    supabase
      .from('equipment')
      .select('id, kind, name, group_id, user_id, status, profiles(username)')
      .not('group_id', 'is', null)
      .order('created_at'),
  ])
  if (grinders.error) {
    throw new Error(`讀取群組器材失敗：${grinders.error.message}`)
  }
  if (equipment.error) {
    throw new Error(`讀取群組器材失敗：${equipment.error.message}`)
  }

  const toItem = (
    row: {
      id: string
      name: string
      group_id: string | null
      user_id: string
      status: string
      profiles: { username: string } | null
    },
    gearKind: GroupGearKind,
  ): GroupGearItem => ({
    id: row.id,
    gearKind,
    name: row.name,
    group_id: row.group_id!,
    user_id: row.user_id,
    status: row.status as GroupGearItem['status'],
    submitter: row.profiles?.username ?? '（未知）',
  })

  return [
    ...grinders.data.map((g) => toItem(g, 'grinder')),
    ...equipment.data.map((e) => toItem(e, e.kind)),
  ]
}
