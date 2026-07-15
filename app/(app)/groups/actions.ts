'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const groupNameSchema = z
  .string()
  .trim()
  .min(1, '請輸入群組名稱')
  .max(50, '名稱過長')

/** 邀請碼：8 碼、去除易混淆字元（0/O、1/I/L） */
function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(8)
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('')
}

/** 群組成員/資料變動會影響的頁面一次重驗 */
function revalidateGroupPages() {
  revalidatePath('/groups', 'layout')
  revalidatePath('/beans')
  revalidatePath('/brews')
}

export type GroupActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

/** FR-10.1：建立群組（建立者自動入群）。 */
export async function createGroup(name: string): Promise<GroupActionResult> {
  const parsed = groupNameSchema.safeParse(name)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '名稱不正確' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '請先登入' }

  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      name: parsed.data,
      owner_id: user.id,
      invite_code: generateInviteCode(),
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: `建立失敗：${error.message}` }

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: user.id })
  if (memberError) {
    await supabase.from('groups').delete().eq('id', group.id) // 補償
    return { ok: false, error: `建立失敗：${memberError.message}` }
  }

  revalidateGroupPages()
  return { ok: true, id: group.id }
}

// ============ FR-10.10 入群審核 ============

/**
 * 以邀請碼「申請」加入（不再直接入群）。碼的查找走 service_role
 * （非成員讀不到群組）；申請列以本人身分寫入（RLS 擋已是成員者）。
 */
export async function applyToGroupByCode(
  code: string,
): Promise<{ ok: true; groupName: string } | { ok: false; error: string }> {
  const trimmed = code.trim().toUpperCase()
  if (!/^[A-Z0-9]{8}$/.test(trimmed)) {
    return { ok: false, error: '邀請碼格式不正確（8 碼英數）' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '請先登入' }

  const admin = createAdminClient()
  const { data: group } = await admin
    .from('groups')
    .select('id, name')
    .eq('invite_code', trimmed)
    .maybeSingle()

  if (!group) return { ok: false, error: '找不到這個邀請碼，請確認後再試' }

  const { error } = await supabase
    .from('group_join_requests')
    .insert({ group_id: group.id, user_id: user.id })

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: '已申請過這個群組，等待建立者核可' }
    }
    // RLS with check：已是成員（42501）
    if (error.code === '42501') {
      return { ok: false, error: '你已經在這個群組裡了' }
    }
    return { ok: false, error: `申請失敗：${error.message}` }
  }

  revalidatePath('/groups', 'layout')
  return { ok: true, groupName: group.name }
}

/** 管理者核可入群申請：加成員＋刪申請列（走 service_role，需先驗管理者身分）。 */
export async function approveJoinRequest(
  requestId: string,
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '請先登入' }

  const admin = createAdminClient()
  const { data: request } = await admin
    .from('group_join_requests')
    .select('id, group_id, user_id, groups(owner_id), profiles(username)')
    .eq('id', requestId)
    .maybeSingle()

  if (!request) return { ok: false, error: '找不到這筆申請（可能已撤回）' }
  // FR-10.12：建立者或副組長皆可核可
  if (request.groups?.owner_id !== user.id) {
    const { data: me } = await admin
      .from('group_members')
      .select('role')
      .eq('group_id', request.group_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (me?.role !== 'admin') {
      return { ok: false, error: '只有群組建立者或副組長可以核可申請' }
    }
  }

  const { error } = await admin
    .from('group_members')
    .insert({ group_id: request.group_id, user_id: request.user_id })
  // 已是成員（23505）視同核可成功，續刪申請列
  if (error && error.code !== '23505') {
    return { ok: false, error: `核可失敗：${error.message}` }
  }

  await admin.from('group_join_requests').delete().eq('id', requestId)

  revalidateGroupPages()
  return { ok: true, username: request.profiles?.username ?? '（未知）' }
}

/** 刪除入群申請：申請人撤回，或建立者退回（RLS 兩者皆放行；對方可再申請）。 */
export async function deleteJoinRequest(
  requestId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error, count } = await supabase
    .from('group_join_requests')
    .delete({ count: 'exact' })
    .eq('id', requestId)

  if (error) return { ok: false, error: `操作失敗：${error.message}` }
  if (!count) return { ok: false, error: '找不到這筆申請或沒有權限' }

  revalidatePath('/groups', 'layout')
  return { ok: true }
}

// ============ 群組管理（自設定頁遷移） ============

/** FR-10.2：重新產生邀請碼（舊碼即失效；RLS 限建立者）。 */
export async function regenerateInviteCode(
  groupId: string,
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const code = generateInviteCode()
  const { data, error } = await supabase
    .from('groups')
    .update({ invite_code: code })
    .eq('id', groupId)
    .select('id')

  if (error) return { ok: false, error: `更新失敗：${error.message}` }
  if (!data.length) return { ok: false, error: '只有群組建立者可以更換邀請碼' }

  revalidatePath('/groups', 'layout')
  return { ok: true, code }
}

/** 退出群組（建立者不可退出，須解散）。 */
export async function leaveGroup(
  groupId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '請先登入' }

  const { data: group } = await supabase
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .maybeSingle()
  if (group?.owner_id === user.id) {
    return { ok: false, error: '建立者無法退出，請改用「解散群組」' }
  }

  const { error, count } = await supabase
    .from('group_members')
    .delete({ count: 'exact' })
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: `退出失敗：${error.message}` }
  if (!count) return { ok: false, error: '你不在這個群組中' }

  revalidateGroupPages()
  return { ok: true }
}

/** FR-10.12：建立者指派/解除副組長（RLS 限建立者的 update 政策）。 */
export async function setGroupMemberRole(
  groupId: string,
  userId: string,
  role: 'member' | 'admin',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '請先登入' }
  if (userId === user.id) {
    return { ok: false, error: '建立者本身即為管理者，不需指派' }
  }

  const { data, error } = await supabase
    .from('group_members')
    .update({ role })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select('user_id')

  if (error) return { ok: false, error: `操作失敗：${error.message}` }
  if (!data.length) return { ok: false, error: '只有群組建立者可以指派副組長' }

  revalidatePath('/groups', 'layout')
  return { ok: true }
}

/** 建立者移除成員。 */
export async function removeGroupMember(
  groupId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '請先登入' }
  if (userId === user.id) {
    return { ok: false, error: '要離開群組請用「退出」' }
  }

  const { error, count } = await supabase
    .from('group_members')
    .delete({ count: 'exact' })
    .eq('group_id', groupId)
    .eq('user_id', userId) // RLS：僅建立者的 delete 政策會放行他人列

  if (error) return { ok: false, error: `移除失敗：${error.message}` }
  if (!count) return { ok: false, error: '沒有權限或成員不存在' }

  revalidateGroupPages()
  return { ok: true }
}

/** FR-10.3：解散群組（RLS 限建立者）；群組豆回歸各建立者的個人豆。 */
export async function deleteGroup(
  groupId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error, count } = await supabase
    .from('groups')
    .delete({ count: 'exact' })
    .eq('id', groupId)

  if (error) return { ok: false, error: `解散失敗：${error.message}` }
  if (!count) return { ok: false, error: '只有群組建立者可以解散群組' }

  revalidateGroupPages()
  return { ok: true }
}

// ============ 標籤審核（FR-5.6，自設定頁遷移） ============

/** 群組建立者核可提交 → 建立群組標籤（全員可用）並標記 approved。 */
export async function approveTagSuggestion(
  suggestionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '請先登入' }

  // RLS：只有建立者能讀到所轄群組的提交
  const { data: suggestion } = await supabase
    .from('tag_suggestions')
    .select('id, name, group_id, status')
    .eq('id', suggestionId)
    .maybeSingle()
  if (!suggestion?.group_id) {
    return { ok: false, error: '找不到這筆提交或沒有權限' }
  }
  if (suggestion.status !== 'pending') {
    return { ok: false, error: '這筆提交已處理過' }
  }

  const { error: tagError } = await supabase.from('flavor_tags').insert({
    name: suggestion.name,
    category: '群組',
    scope: 'group',
    owner_user_id: user.id, // 政策要求＝群組建立者
    group_id: suggestion.group_id,
  })
  // 同名群組標籤已存在（23505）視同核可成功
  if (tagError && tagError.code !== '23505') {
    return { ok: false, error: `核可失敗：${tagError.message}` }
  }

  const { error } = await supabase
    .from('tag_suggestions')
    .update({ status: 'approved' })
    .eq('id', suggestionId)
  if (error) return { ok: false, error: `狀態更新失敗：${error.message}` }

  revalidatePath('/groups', 'layout')
  revalidatePath('/settings')
  revalidatePath('/brews')
  return { ok: true }
}

/** 拒絕提交（提交者的個人標籤不受影響）。 */
export async function rejectTagSuggestion(
  suggestionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tag_suggestions')
    .update({ status: 'rejected' })
    .eq('id', suggestionId)
    .eq('status', 'pending')
    .select('id')

  if (error) return { ok: false, error: `操作失敗：${error.message}` }
  if (!data.length) return { ok: false, error: '找不到這筆提交或沒有權限' }

  revalidatePath('/groups', 'layout')
  revalidatePath('/settings')
  return { ok: true }
}

/**
 * 刪除群組標籤（誤核可的反悔機制）。
 * RLS 限群組建立者；刪除後該標籤自所有沖煮移除（bft cascade）。
 */
export async function deleteGroupTag(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error, count } = await supabase
    .from('flavor_tags')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('scope', 'group')

  if (error) return { ok: false, error: `刪除失敗：${error.message}` }
  if (!count) return { ok: false, error: '只有群組建立者可以刪除群組標籤' }

  revalidatePath('/groups', 'layout')
  revalidatePath('/brews')
  return { ok: true }
}

// ============ 器材審核（FR-10.9b，自設定頁遷移） ============

/**
 * 群組建立者核可成員提案的器材（RLS 擋非建立者的 update）。
 * 核可後全體成員的沖煮下拉即可選用。
 */
export async function approveGroupGear(
  gearKind: 'grinder' | 'dripper' | 'filter' | 'kettle',
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const table = gearKind === 'grinder' ? 'grinders' : 'equipment'
  const { data, error } = await supabase
    .from(table)
    .update({ status: 'approved' })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')

  if (error) return { ok: false, error: `核可失敗：${error.message}` }
  if (!data.length) {
    return { ok: false, error: '找不到這筆提案，或只有群組建立者可以核可' }
  }

  revalidatePath('/groups', 'layout')
  return { ok: true }
}
