import { z } from 'zod'

/**
 * 認證相關驗證（AUTH-1）。
 * username 規則＝決策 D2，必須與 DB trigger 的 regex 一字不差
 * （supabase/migrations/..._create_profiles.sql：^[a-z0-9_-]{3,20}$）。
 */

export const USERNAME_PATTERN = /^[a-z0-9_-]{3,20}$/

/** 輸入正規化：trim + 轉小寫（DB 亦以 lower() 唯一索引） */
export function normalizeUsername(input: string) {
  return input.trim().toLowerCase()
}

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    USERNAME_PATTERN,
    '使用者名稱須為 3–20 字元的小寫英文、數字、_ 或 -',
  )

/** 密碼下限對齊 supabase/config.toml 的 minimum_password_length = 6 */
export const passwordSchema = z
  .string()
  .min(6, '密碼至少 6 個字元')
  .max(72, '密碼過長')

export const emailSchema = z.email('Email 格式不正確')

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: '兩次輸入的密碼不一致',
    path: ['confirmPassword'],
  })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '請輸入密碼'),
})

export const changeUsernameSchema = z.object({
  username: usernameSchema,
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: '兩次輸入的密碼不一致',
    path: ['confirmPassword'],
  })

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
