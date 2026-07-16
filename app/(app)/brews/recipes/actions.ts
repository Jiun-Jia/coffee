'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getBrewPours } from '@/lib/queries/brews'
import type { RecipeRow } from '@/lib/recipe-form'
import {
  recipeSchema,
  saveAsRecipeSchema,
  type RecipeInput,
} from '@/lib/validations/recipe'

export type RecipeActionResult =
  { ok: true; id: string } | { ok: false; error: string }

/** unique(user_id, name) 撞名的友善訊息 */
const DUPLICATE_NAME = '已有同名配方，換個名字吧'

function isUniqueViolation(error: { code?: string }) {
  return error.code === '23505'
}

/** 表單 pours → jsonb 快照（全空列剔除，同 brews actions 口徑） */
function toPourSnapshot(
  pours: RecipeInput['pours'],
): {
  end_time_sec: number | null
  cumulative_water_g: number | null
  note: string | null
}[] {
  return pours
    .filter(
      (p) => p.end_time_sec != null || p.cumulative_water_g != null || p.note,
    )
    .map((p) => ({
      end_time_sec: p.end_time_sec ?? null,
      cumulative_water_g: p.cumulative_water_g ?? null,
      note: p.note ?? null,
    }))
}

/**
 * RCP-2：把一筆「看得到的」沖煮存成我的配方（FR-14.1）。
 * 群組成員的沖煮也可存——這正是「抄朋友的配方」的正規入口；
 * 快照與來源獨立，來源刪除不影響（source_brew_id set null）。
 */
export async function saveBrewAsRecipe(input: {
  brew_id: string
  name: string
}): Promise<RecipeActionResult> {
  const parsed = saveAsRecipeSchema.safeParse(input)
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

  const { data: brew, error: brewError } = await supabase
    .from('brews')
    .select(
      'id, brew_type, dripper, filter, kettle, grinder_id, grind_setting, water_temp, dose_g, water_g, ice_g, ratio_include_ice, bloom_water_g, bloom_time_sec, total_time_sec, pour_notes',
    )
    .eq('id', parsed.data.brew_id)
    .maybeSingle()
  if (brewError)
    return { ok: false, error: `讀取沖煮失敗：${brewError.message}` }
  if (!brew) return { ok: false, error: '找不到這筆沖煮或沒有權限' }

  const pours = await getBrewPours(brew.id)

  const { id: sourceId, ...snapshot } = brew
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      ...snapshot,
      user_id: user.id,
      name: parsed.data.name,
      source_brew_id: sourceId,
      pours: pours.map((p) => ({
        end_time_sec: p.end_time_sec,
        cumulative_water_g: p.cumulative_water_g,
        note: p.note,
      })),
    })
    .select('id')
    .single()

  if (error) {
    if (isUniqueViolation(error)) return { ok: false, error: DUPLICATE_NAME }
    return { ok: false, error: `儲存配方失敗：${error.message}` }
  }

  revalidatePath('/brews/recipes')
  return { ok: true, id: data.id }
}

/** RCP-4：編輯配方（名稱與全部參數；RLS 限本人）。 */
export async function updateRecipe(
  id: string,
  input: RecipeInput,
): Promise<RecipeActionResult> {
  const parsed = recipeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? '輸入格式不正確',
    }
  }

  const supabase = await createClient()
  const { pours, ...fields } = parsed.data
  const { data, error } = await supabase
    .from('recipes')
    .update({ ...fields, pours: toPourSnapshot(pours) })
    .eq('id', id)
    .select('id')

  if (error) {
    if (isUniqueViolation(error)) return { ok: false, error: DUPLICATE_NAME }
    return { ok: false, error: `更新失敗：${error.message}` }
  }
  if (!data.length) return { ok: false, error: '找不到這個配方或沒有權限' }

  revalidatePath('/brews/recipes')
  revalidatePath('/groups', 'layout') // 建立者可能編輯的是群組配方
  return { ok: true, id }
}

export async function deleteRecipe(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error, count } = await supabase
    .from('recipes')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) return { ok: false, error: `刪除失敗：${error.message}` }
  if (!count) return { ok: false, error: '找不到這個配方或沒有權限' }

  revalidatePath('/brews/recipes')
  revalidatePath('/groups', 'layout')
  return { ok: true }
}

// ============ FR-14.5～14.7 群組配方 ============

/** 快照複製時要剝除的欄位（id/時間戳/歸屬/狀態由新列自行決定） */
function toSnapshot(source: RecipeRow) {
  const fields: Partial<RecipeRow> = { ...source }
  delete fields.id
  delete fields.created_at
  delete fields.updated_at
  delete fields.group_id
  delete fields.status
  return fields
}

/**
 * FR-14.5 推薦給群組：快照複製一份 pending（個人原件保留、兩邊獨立）。
 * 管理者（建立者/副組長）推薦＝自案自核直接生效（同器材 FR-10.9b 慣例）。
 */
export async function submitRecipeToGroup(
  recipeId: string,
  groupId: string,
): Promise<
  { ok: true; id: string; pending: boolean } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '請先登入' }

  // 只能推薦「自己的個人配方」
  const { data: source, error: srcError } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .eq('user_id', user.id)
    .is('group_id', null)
    .maybeSingle()
  if (srcError) return { ok: false, error: `讀取配方失敗：${srcError.message}` }
  if (!source) return { ok: false, error: '找不到這個配方或沒有權限' }

  const { data: isManager, error: mgrError } = await supabase.rpc(
    'is_group_manager',
    { gid: groupId },
  )
  if (mgrError) return { ok: false, error: `權限確認失敗：${mgrError.message}` }

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      ...toSnapshot(source),
      name: source.name,
      user_id: user.id,
      group_id: groupId,
      status: isManager ? 'approved' : 'pending',
    })
    .select('id')
    .single()

  if (error) {
    if (isUniqueViolation(error))
      return { ok: false, error: '群組已有同名配方（或審核中），改個名字再推薦' }
    return { ok: false, error: `推薦失敗：${error.message}` }
  }

  revalidatePath('/groups', 'layout')
  revalidatePath('/brews/recipes')
  return { ok: true, id: data.id, pending: !isManager }
}

/** 核可群組配方（RLS：限管理者、限 pending）。 */
export async function approveGroupRecipe(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipes')
    .update({ status: 'approved' })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')

  if (error) return { ok: false, error: `核可失敗：${error.message}` }
  if (!data.length) return { ok: false, error: '找不到這筆提交或沒有權限' }

  revalidatePath('/groups', 'layout')
  revalidatePath('/brews/recipes')
  return { ok: true }
}

/** 退回（管理者）/ 撤回（提交者）待審配方＝刪除該份快照複製。 */
export async function removeGroupRecipeSubmission(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error, count } = await supabase
    .from('recipes')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('status', 'pending')

  if (error) return { ok: false, error: `操作失敗：${error.message}` }
  if (!count) return { ok: false, error: '找不到這筆提交或沒有權限' }

  revalidatePath('/groups', 'layout')
  return { ok: true }
}

/** FR-14.7 複製群組配方到我的個人配方（沖個人豆用）。 */
export async function copyGroupRecipeToMine(
  recipeId: string,
  name: string,
): Promise<RecipeActionResult> {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 60)
    return { ok: false, error: '請輸入 1–60 字的配方名稱' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '請先登入' }

  // RLS 已限定「我看得到的群組配方」
  const { data: source, error: srcError } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .not('group_id', 'is', null)
    .maybeSingle()
  if (srcError) return { ok: false, error: `讀取配方失敗：${srcError.message}` }
  if (!source) return { ok: false, error: '找不到這個配方或沒有權限' }

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      ...toSnapshot(source),
      name: trimmed,
      user_id: user.id,
      group_id: null,
      status: 'approved',
    })
    .select('id')
    .single()

  if (error) {
    if (isUniqueViolation(error)) return { ok: false, error: DUPLICATE_NAME }
    return { ok: false, error: `複製失敗：${error.message}` }
  }

  revalidatePath('/brews/recipes')
  return { ok: true, id: data.id }
}
