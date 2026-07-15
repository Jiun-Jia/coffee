import { createClient } from '@/lib/supabase/server'
import type { EquipmentKind } from '@/lib/queries/equipment'

export type GroupRole = 'member' | 'admin'
export type GroupMember = {
  user_id: string
  username: string
  role: GroupRole
}
export type MyGroup = {
  id: string
  name: string
  owner_id: string
  invite_code: string
  isOwner: boolean
  /** 建立者或副組長（FR-10.12）＝可審核入群/器材/標籤 */
  isManager: boolean
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
    .select(
      'id, name, owner_id, invite_code, group_members(user_id, role, profiles(username))',
    )
    .order('created_at')

  if (error) throw new Error(`讀取群組失敗：${error.message}`)

  return (
    data
      // FR-10.10 後「申請中」的群組也讀得到（只為顯示名稱），這裡只留已加入的
      .filter(
        (g) =>
          g.owner_id === user.id ||
          g.group_members.some((m) => m.user_id === user.id),
      )
      .map((g) => {
        const isOwner = g.owner_id === user.id
        const myRole = g.group_members.find((m) => m.user_id === user.id)?.role
        return {
          id: g.id,
          name: g.name,
          owner_id: g.owner_id,
          invite_code: g.invite_code,
          isOwner,
          isManager: isOwner || myRole === 'admin',
          members: g.group_members.map((m) => ({
            user_id: m.user_id,
            username: m.profiles?.username ?? '（未知）',
            role: (m.role === 'admin' ? 'admin' : 'member') as GroupRole,
          })),
        }
      })
  )
}

// ============ FR-10.10 入群審核 ============

export type MyJoinRequest = {
  id: string
  group_id: string
  group_name: string
  created_at: string
}
export type GroupJoinRequest = {
  id: string
  group_id: string
  user_id: string
  username: string
  created_at: string
}

/** 我送出的入群申請（申請中）。群組名稱靠 has_pending_join_request 政策可讀。 */
export async function listMyJoinRequests(): Promise<MyJoinRequest[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('group_join_requests')
    .select('id, group_id, created_at, groups(name)')
    .eq('user_id', user.id)
    .order('created_at')

  if (error) throw new Error(`讀取入群申請失敗：${error.message}`)
  return data.map((r) => ({
    id: r.id,
    group_id: r.group_id,
    group_name: r.groups?.name ?? '（未知）',
    created_at: r.created_at,
  }))
}

/** 待我審核的入群申請（我建立的群組）。申請人名稱靠 requested_my_group 政策可讀。 */
export async function listGroupJoinRequests(): Promise<GroupJoinRequest[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // RLS 回「我的申請＋我群組收到的申請」；排除自己的即為待審清單
  const { data, error } = await supabase
    .from('group_join_requests')
    .select('id, group_id, user_id, created_at, profiles(username)')
    .neq('user_id', user.id)
    .order('created_at')

  if (error) throw new Error(`讀取待審申請失敗：${error.message}`)
  return data.map((r) => ({
    id: r.id,
    group_id: r.group_id,
    user_id: r.user_id,
    username: r.profiles?.username ?? '（未知）',
    created_at: r.created_at,
  }))
}

/**
 * 群組豆上的全部沖煮（最近動態＋每支豆最佳排行共用；RLS 限成員可見）。
 * 朋友圈規模資料量小，直接全撈（上限 2000 筆保險）。
 */
export async function listGroupBrews(groupId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brew_details')
    .select('id, bean_id, brewed_at, overall, name_batch, roaster, brewer_username')
    .eq('group_id', groupId)
    .order('brewed_at', { ascending: false })
    .limit(2000)

  if (error) throw new Error(`讀取群組沖煮失敗：${error.message}`)
  return data
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
