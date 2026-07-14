'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { grinderSchema, type GrinderInput } from '@/lib/validations/grinder'

const tagNameSchema = z
  .string()
  .trim()
  .min(1, '請輸入標籤名稱')
  .max(30, '標籤名稱過長')

/** 使用者自訂標籤的固定分類（PRD §8 分類保留給內建標籤） */
const USER_TAG_CATEGORY = '自訂'

export type GrinderActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

/**
 * BEAN-7：磨豆機 CRUD。
 * 同帳號名稱唯一靠 DB unique(user_id, name)，捕捉 23505 轉繁中
 * （不可先 select 再 insert，有 race condition）。
 */
export async function createGrinder(
  input: GrinderInput,
  groupId?: string, // FR-10.9：歸屬群組（undefined＝個人）
): Promise<GrinderActionResult> {
  const parsed = grinderSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? '輸入格式不正確',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '請先登入' }

  const { data, error } = await supabase
    .from('grinders')
    .insert({ ...parsed.data, user_id: user.id, group_id: groupId ?? null })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: '已有同名磨豆機' }
    }
    return { ok: false, error: `新增失敗：${error.message}` }
  }

  revalidatePath('/settings')
  return { ok: true, id: data.id }
}

export async function updateGrinder(
  id: string,
  input: GrinderInput,
): Promise<GrinderActionResult> {
  const parsed = grinderSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? '輸入格式不正確',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('grinders')
    .update(parsed.data)
    .eq('id', id)
    .select('id')

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: '已有同名磨豆機' }
    }
    return { ok: false, error: `更新失敗：${error.message}` }
  }
  if (!data.length) return { ok: false, error: '找不到這台磨豆機或沒有權限' }

  revalidatePath('/settings')
  return { ok: true, id }
}

// ============ FR-10 群組 ============

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

  revalidatePath('/settings')
  return { ok: true, id: group.id }
}

/** FR-10.2：以邀請碼加入。碼的查找走 service_role（非成員讀不到群組）。 */
export async function joinGroupByCode(
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

  const { error } = await admin
    .from('group_members')
    .insert({ group_id: group.id, user_id: user.id })

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: '你已經在這個群組裡了' }
    }
    return { ok: false, error: `加入失敗：${error.message}` }
  }

  revalidatePath('/settings')
  revalidatePath('/beans')
  revalidatePath('/brews')
  return { ok: true, groupName: group.name }
}

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

  revalidatePath('/settings')
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

  revalidatePath('/settings')
  revalidatePath('/beans')
  revalidatePath('/brews')
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

  revalidatePath('/settings')
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

  revalidatePath('/settings')
  revalidatePath('/beans')
  revalidatePath('/brews')
  return { ok: true }
}

// ============ 器材 ============

const equipmentKindSchema = z.enum(['dripper', 'filter', 'kettle'])
const equipmentNameSchema = z
  .string()
  .trim()
  .min(1, '請輸入器材名稱')
  .max(100, '名稱過長')

/** 器材清單（濾杯/濾紙/手沖壺）：新增。同類別同名靠 DB unique 擋（23505）。 */
export async function createEquipment(
  kind: 'dripper' | 'filter' | 'kettle',
  name: string,
  groupId?: string, // FR-10.9：歸屬群組（undefined＝個人）
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsedKind = equipmentKindSchema.safeParse(kind)
  const parsedName = equipmentNameSchema.safeParse(name)
  if (!parsedKind.success || !parsedName.success) {
    return { ok: false, error: '輸入格式不正確' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '請先登入' }

  const { data, error } = await supabase
    .from('equipment')
    .insert({
      user_id: user.id,
      kind: parsedKind.data,
      name: parsedName.data,
      group_id: groupId ?? null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { ok: false, error: '已有同名器材' }
    return { ok: false, error: `新增失敗：${error.message}` }
  }

  revalidatePath('/settings')
  return { ok: true, id: data.id }
}

/** 器材清單：刪除（沖煮紀錄存文字不受影響）。 */
export async function deleteEquipment(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error, count } = await supabase
    .from('equipment')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) return { ok: false, error: `刪除失敗：${error.message}` }
  if (!count) return { ok: false, error: '找不到這件器材或沒有權限' }

  revalidatePath('/settings')
  return { ok: true }
}

export type CreateTagResult =
  | { ok: true; tag: { id: string; name: string; category: string } }
  | { ok: false; error: string }

/**
 * BREW-9：建立自訂標籤（scope=user，個人私有 FR-5.3）。
 * 同名撞 unique（uq_tag_user）時直接回傳既有標籤讓使用者選用。
 * suggestToGroupId：同步提交到該群組審核（FR-5.6 改版；個人標籤先立即可用）。
 */
export async function createUserTag(
  name: string,
  suggestToGroupId?: string,
): Promise<CreateTagResult> {
  const parsed = tagNameSchema.safeParse(name)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '名稱不正確' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '請先登入' }

  let tag: { id: string; name: string; category: string } | null = null
  const { data, error } = await supabase
    .from('flavor_tags')
    .insert({
      name: parsed.data,
      category: USER_TAG_CATEGORY,
      scope: 'user',
      owner_user_id: user.id,
    })
    .select('id, name, category')
    .single()

  if (error) {
    if (error.code !== '23505') {
      return { ok: false, error: `建立失敗：${error.message}` }
    }
    // 已有同名自訂標籤 → 直接回傳既有的
    const { data: existing } = await supabase
      .from('flavor_tags')
      .select('id, name, category')
      .eq('scope', 'user')
      .eq('name', parsed.data)
      .maybeSingle()
    if (!existing) return { ok: false, error: '建立失敗，請稍後再試' }
    tag = existing
  } else {
    tag = data
  }

  if (suggestToGroupId) {
    await supabase.from('tag_suggestions').insert({
      user_id: user.id,
      name: parsed.data,
      group_id: suggestToGroupId,
    })
    // 提交失敗不擋主流程（個人標籤本身已可用）
  }

  revalidatePath('/settings')
  return { ok: true, tag }
}

/** FR-5.6：群組建立者核可提交 → 建立群組標籤（全員可用）並標記 approved。 */
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

  revalidatePath('/settings')
  revalidatePath('/brews')
  return { ok: true }
}

/** FR-5.6：拒絕提交（提交者的個人標籤不受影響）。 */
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

  revalidatePath('/settings')
  return { ok: true }
}

/** BREW-17：刪除自訂標籤（brew_flavor_tags 由 FK cascade 一併移除關聯）。 */
export async function deleteUserTag(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error, count } = await supabase
    .from('flavor_tags')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('scope', 'user') // RLS 已限本人；雙保險不誤刪 system

  if (error) return { ok: false, error: `刪除失敗：${error.message}` }
  if (!count) return { ok: false, error: '找不到這個標籤或沒有權限' }

  revalidatePath('/settings')
  revalidatePath('/brews')
  return { ok: true }
}

/** 刪除後歷史沖煮的 grinder_id 由 DB set null（刻度文字保留，D9）。 */
export async function deleteGrinder(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error, count } = await supabase
    .from('grinders')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) return { ok: false, error: `刪除失敗：${error.message}` }
  if (!count) return { ok: false, error: '找不到這台磨豆機或沒有權限' }

  revalidatePath('/settings')
  return { ok: true }
}
