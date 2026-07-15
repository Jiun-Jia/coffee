'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getBrewPours } from '@/lib/queries/brews'
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
  return { ok: true }
}
