import { createClient } from '@/lib/supabase/server'
import type { RecipeRow } from '@/lib/recipe-form'

export type RecipeWithGrinder = RecipeRow & {
  grinders: { name: string } | null
}

/** 我的配方（FR-14.4 個人私有，RLS 已限本人），最近更新在前。 */
export async function listRecipes(): Promise<RecipeWithGrinder[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipes')
    .select('*, grinders(name)')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`讀取配方失敗：${error.message}`)
  return data
}

export async function getRecipe(id: string): Promise<RecipeWithGrinder | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipes')
    .select('*, grinders(name)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`讀取配方失敗：${error.message}`)
  return data
}
