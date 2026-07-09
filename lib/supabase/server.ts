import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getPublicEnv } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Server 端 Supabase client（Server Components / Server Actions / Route Handlers 用）。
 * 每個 request 建立新實例，不可快取成模組層單例（cookies 綁定當前請求）。
 */
export async function createClient() {
  const env = getPublicEnv()
  const cookieStore = await cookies()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server Component 內無法寫 cookie；token 刷新由 proxy.ts 的
            // updateSession 負責，這裡吞掉即可。
          }
        },
      },
    },
  )
}
