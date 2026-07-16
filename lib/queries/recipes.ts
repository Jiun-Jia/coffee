import { createClient } from '@/lib/supabase/server'
import type { RecipeRow } from '@/lib/recipe-form'

/** 配方＋顯示用內嵌（磨豆機名、推薦者名、群組名） */
export type RecipeWithMeta = RecipeRow & {
  grinders: { name: string } | null
  profiles: { username: string } | null
  groups: { name: string } | null
}

const RECIPE_SELECT = '*, grinders(name), profiles(username), groups(name)'

/**
 * 我看得到的全部配方（RLS：個人＝本人；群組＝成員可見 approved＋
 * 自己的 pending），最近更新在前。個人/群組的分區由呼叫端依
 * group_id / status 過濾。
 */
export async function listRecipes(): Promise<RecipeWithMeta[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`讀取配方失敗：${error.message}`)
  return data
}

/** 單一群組的配方（群組內頁用；pending 的可見性由 RLS 決定）。 */
export async function listGroupRecipes(
  groupId: string,
): Promise<RecipeWithMeta[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('group_id', groupId)
    .order('created_at')

  if (error) throw new Error(`讀取群組配方失敗：${error.message}`)
  return data
}

export async function getRecipe(id: string): Promise<RecipeWithMeta | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`讀取配方失敗：${error.message}`)
  return data
}
