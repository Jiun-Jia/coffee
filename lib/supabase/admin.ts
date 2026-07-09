import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getPublicEnv } from '@/lib/env'
import { getServerEnv } from '@/lib/env.server'
import type { Database } from '@/types/database'

/**
 * service_role client：繞過 RLS，僅限伺服器端的管理作業
 * （username 可用性預檢 AUTH-3、標籤審核等）。
 * `import 'server-only'` 確保被 Client Component 引用時直接編譯失敗（TECH §4）。
 */
export function createAdminClient() {
  const publicEnv = getPublicEnv()
  const serverEnv = getServerEnv()

  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
