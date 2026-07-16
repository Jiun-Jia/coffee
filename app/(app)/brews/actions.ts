'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const { tag_ids, pours, ...fields } = parsed.data
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

  const cleanPours = pours.filter(
    (p) => p.end_time_sec != null || p.cumulative_water_g != null || p.note,
  )
  if (cleanPours.length > 0) {
    const { error: pourError } = await supabase.from('brew_pours').insert(
      cleanPours.map((p, i) => ({
        brew_id: data.id,
        seq: i + 1,
        end_time_sec: p.end_time_sec ?? null,
        cumulative_water_g: p.cumulative_water_g ?? null,
        note: p.note ?? null,
      })),
    )
    if (pourError) {
      await supabase.from('brews').delete().eq('id', data.id) // 補償
      return { ok: false, error: `分段儲存失敗：${pourError.message}` }
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
  const { tag_ids, pours, ...fields } = parsed.data
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

  // 分段同步（全刪重建，同標籤策略）
  const { error: pourDelError } = await supabase
    .from('brew_pours')
    .delete()
    .eq('brew_id', id)
  if (pourDelError)
    return { ok: false, error: `分段更新失敗：${pourDelError.message}` }

  const cleanPours = pours.filter(
    (p) => p.end_time_sec != null || p.cumulative_water_g != null || p.note,
  )
  if (cleanPours.length > 0) {
    const { error: pourError } = await supabase.from('brew_pours').insert(
      cleanPours.map((p, i) => ({
        brew_id: id,
        seq: i + 1,
        end_time_sec: p.end_time_sec ?? null,
        cumulative_water_g: p.cumulative_water_g ?? null,
        note: p.note ?? null,
      })),
    )
    if (pourError)
      return { ok: false, error: `分段更新失敗：${pourError.message}` }
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
  // PHOTO-3：先取照片路徑，row 刪成功後連動清 Storage（best-effort）
  const { data: existing } = await supabase
    .from('brews')
    .select('photo_path')
    .eq('id', id)
    .maybeSingle()

  const { error, count } = await supabase
    .from('brews')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) return { ok: false, error: `刪除失敗：${error.message}` }
  if (!count) return { ok: false, error: '找不到這筆紀錄或沒有權限' }

  if (existing?.photo_path) {
    await createAdminClient().storage.from('photos').remove([existing.photo_path])
  }

  revalidatePath('/brews')
  revalidatePath('/beans')
  revalidatePath('/dashboard')
  return { ok: true }
}

/** FR-22 設定成品照路徑（上傳/刪除後回寫；RLS 限本人）。 */
export async function setBrewPhoto(
  id: string,
  path: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brews')
    .update({ photo_path: path })
    .eq('id', id)
    .select('id')

  if (error) return { ok: false, error: `照片更新失敗：${error.message}` }
  if (!data.length) return { ok: false, error: '找不到這筆紀錄或沒有權限' }

  revalidatePath(`/brews/${id}`)
  return { ok: true }
}

/** FR-9 公開分享開關（僅本人的沖煮；RLS 把關）。開＝產生 slug、關＝作廢。 */
export async function setBrewShared(
  id: string,
  shared: boolean,
): Promise<{ ok: true; slug: string | null } | { ok: false; error: string }> {
  const slug = shared ? randomBytes(12).toString('base64url') : null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brews')
    .update({ public_slug: slug })
    .eq('id', id)
    .select('id')

  if (error) return { ok: false, error: `分享設定失敗：${error.message}` }
  if (!data.length) return { ok: false, error: '找不到這筆紀錄或沒有權限' }

  revalidatePath(`/brews/${id}`)
  return { ok: true, slug }
}
