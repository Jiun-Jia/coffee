'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { brewSchema, type BrewInput } from '@/lib/validations/brew'

export type BrewActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

/** BREW-3：新增沖煮。標籤關聯與主檔非同交易（失敗補償刪除，量級小可接受）。 */
export async function createBrew(input: BrewInput): Promise<BrewActionResult> {
  const parsed = brewSchema.safeParse(input)
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

  const { tag_ids, ...fields } = parsed.data
  const { data, error } = await supabase
    .from('brews')
    .insert({ ...fields, user_id: user.id })
    .select('id')
    .single()

  if (error) return { ok: false, error: `新增失敗：${error.message}` }

  if (tag_ids.length > 0) {
    const { error: tagError } = await supabase
      .from('brew_flavor_tags')
      .insert(tag_ids.map((tag_id) => ({ brew_id: data.id, tag_id })))
    if (tagError) {
      await supabase.from('brews').delete().eq('id', data.id) // 補償
      return { ok: false, error: `標籤儲存失敗：${tagError.message}` }
    }
  }

  revalidatePath('/brews')
  revalidatePath(`/beans/${fields.bean_id}`)
  revalidatePath('/dashboard')
  return { ok: true, id: data.id }
}

/** BREW-3：更新沖煮。標籤同步採全刪重建（單人量級，簡單正確優先）。 */
export async function updateBrew(
  id: string,
  input: BrewInput,
): Promise<BrewActionResult> {
  const parsed = brewSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? '輸入格式不正確',
    }
  }

  const supabase = await createClient()
  const { tag_ids, ...fields } = parsed.data
  const { data, error } = await supabase
    .from('brews')
    .update(fields)
    .eq('id', id)
    .select('id')

  if (error) return { ok: false, error: `更新失敗：${error.message}` }
  if (!data.length) return { ok: false, error: '找不到這筆紀錄或沒有權限' }

  const { error: delError } = await supabase
    .from('brew_flavor_tags')
    .delete()
    .eq('brew_id', id)
  if (delError) return { ok: false, error: `標籤更新失敗：${delError.message}` }

  if (tag_ids.length > 0) {
    const { error: tagError } = await supabase
      .from('brew_flavor_tags')
      .insert(tag_ids.map((tag_id) => ({ brew_id: id, tag_id })))
    if (tagError)
      return { ok: false, error: `標籤更新失敗：${tagError.message}` }
  }

  revalidatePath('/brews')
  revalidatePath(`/brews/${id}`)
  revalidatePath(`/beans/${fields.bean_id}`)
  revalidatePath('/dashboard')
  return { ok: true, id }
}

/** BREW-16：刪除沖煮（一般確認即可，type-to-confirm 僅豆子需要）。 */
export async function deleteBrew(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error, count } = await supabase
    .from('brews')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) return { ok: false, error: `刪除失敗：${error.message}` }
  if (!count) return { ok: false, error: '找不到這筆紀錄或沒有權限' }

  revalidatePath('/brews')
  revalidatePath('/beans')
  revalidatePath('/dashboard')
  return { ok: true }
}
