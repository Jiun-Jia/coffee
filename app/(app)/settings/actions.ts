'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { grinderSchema, type GrinderInput } from '@/lib/validations/grinder'

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
    .insert({ ...parsed.data, user_id: user.id })
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
