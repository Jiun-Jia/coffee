import { z } from 'zod'

/**
 * 前端可見的環境變數（NEXT_PUBLIC_*）。
 * 於使用時驗證（非模組載入時），避免缺值讓整個 build 掛掉。
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ message: 'NEXT_PUBLIC_SUPABASE_URL 必須是合法 URL' }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, '缺少 NEXT_PUBLIC_SUPABASE_ANON_KEY'),
})

export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
}
