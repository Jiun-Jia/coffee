import 'server-only'
import { z } from 'zod'

/**
 * 僅 Server 端可用的環境變數。
 * `import 'server-only'` 確保本模組被 Client Component 引用時直接編譯失敗，
 * 防止 service_role 金鑰進入前端 bundle（TECH §4）。
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, '缺少 SUPABASE_SERVICE_ROLE_KEY'),
})

export function getServerEnv() {
  return serverEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
}
