'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authErrorMessage } from '@/lib/auth/messages'
import {
  changeUsernameSchema,
  forgotPasswordSchema,
  loginSchema,
  normalizeUsername,
  registerSchema,
  resetPasswordSchema,
  USERNAME_PATTERN,
} from '@/lib/validations/auth'

export type AuthActionResult = { error: string } | undefined

/**
 * AUTH-3：username 可用性預檢。
 * profiles 受 RLS 保護（僅本人可讀），故用 admin client 查詢；
 * 僅回傳 boolean，不外洩任何其他資料。DB 的 lower() unique index 是最後防線。
 */
export async function checkUsernameAvailable(input: string): Promise<boolean> {
  const username = normalizeUsername(input)
  if (!USERNAME_PATTERN.test(username)) return false

  const admin = createAdminClient()
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('username', username)

  if (error) return false // 查詢失敗時保守回不可用，交給送出時的最後防線
  return (count ?? 0) === 0
}

/** AUTH-4：註冊。成功即自動登入（config 已停用 email 確認，D1）並導向首頁。 */
export async function registerAction(input: {
  username: string
  email: string
  password: string
  confirmPassword: string
}): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '輸入格式不正確' }
  }

  if (!(await checkUsernameAvailable(parsed.data.username))) {
    return { error: '這個使用者名稱已被使用' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { username: parsed.data.username } },
  })

  if (error) return { error: authErrorMessage(error) }
  redirect('/dashboard')
}

/** AUTH-6：登入。redirectTo 僅接受站內相對路徑（防 open redirect）。 */
export async function loginAction(
  input: { email: string; password: string },
  redirectTo?: string,
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '輸入格式不正確' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: authErrorMessage(error) }

  const safeTarget =
    redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
      ? redirectTo
      : '/dashboard'
  redirect(safeTarget)
}

/** AUTH-7：登出。 */
export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

/** AUTH-11：修改 username。23505（unique 違反）映射為繁中訊息。 */
export async function updateUsernameAction(input: {
  username: string
}): Promise<AuthActionResult> {
  const parsed = changeUsernameSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '輸入格式不正確' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '請先登入' }

  const { error } = await supabase
    .from('profiles')
    .update({ username: parsed.data.username })
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505') return { error: '這個使用者名稱已被使用' }
    return { error: '更新失敗，請稍後再試' }
  }

  revalidatePath('/', 'layout') // username 顯示在全站側邊欄
  return undefined
}

/** AUTH-14：寄送重設密碼信。一律回成功訊息（不洩漏 email 是否存在）。 */
export async function forgotPasswordAction(input: {
  email: string
}): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '輸入格式不正確' }
  }

  const headerList = await headers()
  const origin =
    headerList.get('origin') ?? `https://${headerList.get('host') ?? ''}`

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  })
  return undefined
}

/** AUTH-14：設定新密碼（需持有 recovery session，由 /auth/confirm 建立）。 */
export async function resetPasswordAction(input: {
  password: string
  confirmPassword: string
}): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '輸入格式不正確' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })
  if (error) return { error: authErrorMessage(error) }
  redirect('/dashboard')
}
