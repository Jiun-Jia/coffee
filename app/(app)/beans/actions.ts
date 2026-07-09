'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { beanSchema, type BeanInput } from '@/lib/validations/bean'

export type BeanActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

/** BEAN-2：新增豆子。user_id 由 session 帶入（不信任前端），寫入受 RLS 保護。 */
export async function createBean(input: BeanInput): Promise<BeanActionResult> {
  const parsed = beanSchema.safeParse(input)
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
    .from('beans')
    .insert({ ...parsed.data, user_id: user.id })
    .select('id')
    .single()

  if (error) return { ok: false, error: `新增失敗：${error.message}` }

  revalidatePath('/beans')
  return { ok: true, id: data.id }
}

/** BEAN-2：更新豆子。RLS 下更新他人資料會回 0 列，需轉為明確錯誤。 */
export async function updateBean(
  id: string,
  input: BeanInput,
): Promise<BeanActionResult> {
  const parsed = beanSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? '輸入格式不正確',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('beans')
    .update(parsed.data)
    .eq('id', id)
    .select('id')

  if (error) return { ok: false, error: `更新失敗：${error.message}` }
  if (!data.length) return { ok: false, error: '找不到這包豆子或沒有權限' }

  revalidatePath('/beans')
  revalidatePath(`/beans/${id}`)
  return { ok: true, id }
}

/**
 * BEAN-6：刪除豆子（type-to-confirm）。
 * server 端重新比對豆名（不信任前端 disabled 狀態）；
 * 連帶刪除沖煮由 DB 的 on delete cascade 實現（FR-2.3）。
 */
export async function deleteBean(
  id: string,
  confirmName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()

  const { data: bean } = await supabase
    .from('beans')
    .select('id, name_batch')
    .eq('id', id)
    .maybeSingle()

  if (!bean) return { ok: false, error: '找不到這包豆子或沒有權限' }
  if (confirmName.trim() !== bean.name_batch) {
    return { ok: false, error: '輸入的豆名不一致' }
  }

  const { error } = await supabase.from('beans').delete().eq('id', id)
  if (error) return { ok: false, error: `刪除失敗：${error.message}` }

  revalidatePath('/beans')
  revalidatePath('/brews')
  return { ok: true }
}

/** BEAN-6：開啟刪除對話框時即時查連帶沖煮筆數（不用列表快取值）。 */
export async function countBeanBrews(beanId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('brews')
    .select('id', { count: 'exact', head: true })
    .eq('bean_id', beanId)
  return count ?? 0
}
