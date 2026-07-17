'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
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
  { ok: true; id: string; pending?: boolean } | { ok: false; error: string }

/**
 * FR-10.9b：群組器材審核 —— 一般成員新增為 pending（提案）、
 * 管理者（建立者或副組長，FR-10.12）新增直接 approved。
 */
async function resolveGearStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  groupId: string,
): Promise<{ status: 'pending' | 'approved' } | { error: string }> {
  const { data: group } = await supabase
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .maybeSingle()
  if (!group) return { error: '找不到這個群組' }
  if (group.owner_id === userId) return { status: 'approved' }

  const { data: me } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()
  return { status: me?.role === 'admin' ? 'approved' : 'pending' }
}

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

  let status: 'pending' | 'approved' = 'approved'
  if (groupId) {
    const resolved = await resolveGearStatus(supabase, user.id, groupId)
    if ('error' in resolved) return { ok: false, error: resolved.error }
    status = resolved.status
  }

  const { data, error } = await supabase
    .from('grinders')
    .insert({
      ...parsed.data,
      user_id: user.id,
      group_id: groupId ?? null,
      status,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: '已有同名磨豆機' }
    }
    return { ok: false, error: `新增失敗：${error.message}` }
  }

  revalidatePath('/settings')
  revalidatePath('/groups', 'layout')
  return { ok: true, id: data.id, pending: status === 'pending' }
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
): Promise<
  { ok: true; id: string; pending?: boolean } | { ok: false; error: string }
> {
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

  let status: 'pending' | 'approved' = 'approved'
  if (groupId) {
    const resolved = await resolveGearStatus(supabase, user.id, groupId)
    if ('error' in resolved) return { ok: false, error: resolved.error }
    status = resolved.status
  }

  const { data, error } = await supabase
    .from('equipment')
    .insert({
      user_id: user.id,
      kind: parsedKind.data,
      name: parsedName.data,
      group_id: groupId ?? null,
      status,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { ok: false, error: '已有同名器材' }
    return { ok: false, error: `新增失敗：${error.message}` }
  }

  revalidatePath('/settings')
  revalidatePath('/groups', 'layout')
  return { ok: true, id: data.id, pending: status === 'pending' }
}

/**
 * 器材改名（2026-07-17 回饋）：沖煮/配方存的是**文字**，單純改清單
 * 名稱會讓舊紀錄變孤兒——所以一併把「我的」沖煮與配方裡的舊名稱
 * 同步成新名稱。群組器材：其他成員的紀錄動不了（RLS），他們的舊
 * 紀錄保留原文字。
 */
export async function renameEquipment(
  id: string,
  newName: string,
): Promise<
  | { ok: true; updatedBrews: number; updatedRecipes: number }
  | { ok: false; error: string }
> {
  const parsedName = equipmentNameSchema.safeParse(newName)
  if (!parsedName.success) return { ok: false, error: '名稱格式不正確' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '請先登入' }

  const { data: item } = await supabase
    .from('equipment')
    .select('id, kind, name')
    .eq('id', id)
    .maybeSingle()
  if (!item) return { ok: false, error: '找不到這件器材或沒有權限' }
  if (item.name === parsedName.data)
    return { ok: true, updatedBrews: 0, updatedRecipes: 0 }

  const { data: updated, error } = await supabase
    .from('equipment')
    .update({ name: parsedName.data })
    .eq('id', id)
    .select('id')
  if (error) {
    if (error.code === '23505') return { ok: false, error: '已有同名器材' }
    return { ok: false, error: `改名失敗：${error.message}` }
  }
  if (!updated.length) return { ok: false, error: '找不到這件器材或沒有權限' }

  // 同步我的沖煮與配方（該 kind 欄位文字完全等於舊名的列）。
  // 明確分支而非計算屬性鍵：supabase 的型別化 update 不收 string index。
  const col = item.kind as 'dripper' | 'filter' | 'kettle'
  const payload =
    col === 'dripper'
      ? { dripper: parsedName.data }
      : col === 'filter'
        ? { filter: parsedName.data }
        : { kettle: parsedName.data }
  const [brewsRes, recipesRes] = await Promise.all([
    supabase
      .from('brews')
      .update(payload, { count: 'exact' })
      .eq(col, item.name)
      .eq('user_id', user.id),
    supabase
      .from('recipes')
      .update(payload, { count: 'exact' })
      .eq(col, item.name)
      .eq('user_id', user.id),
  ])

  revalidatePath('/settings')
  revalidatePath('/groups', 'layout')
  revalidatePath('/brews', 'layout')
  return {
    ok: true,
    updatedBrews: brewsRes.count ?? 0,
    updatedRecipes: recipesRes.count ?? 0,
  }
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
  revalidatePath('/groups', 'layout')
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
  revalidatePath('/groups', 'layout')
  return { ok: true, tag }
}

/**
 * 個人標籤改名（2026-07-17 回饋）：標籤以 id 關聯（brew_flavor_tags），
 * 改名後所有掛過它的沖煮自動顯示新名稱，不需逐筆更新。
 */
export async function renameUserTag(
  id: string,
  newName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = tagNameSchema.safeParse(newName)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '名稱不正確' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flavor_tags')
    .update({ name: parsed.data })
    .eq('id', id)
    .eq('scope', 'user') // 僅個人標籤；群組標籤由群組頁管理
    .select('id')

  if (error) {
    if (error.code === '23505') return { ok: false, error: '已有同名標籤' }
    return { ok: false, error: `改名失敗：${error.message}` }
  }
  if (!data.length) return { ok: false, error: '找不到這個標籤或沒有權限' }

  revalidatePath('/settings')
  revalidatePath('/brews', 'layout')
  return { ok: true }
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

/**
 * FR-5.6：刪除群組標籤（誤核可的反悔機制）。
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
  revalidatePath('/groups', 'layout')
  return { ok: true }
}
