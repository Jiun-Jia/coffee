import { createBrowserClient } from '@supabase/ssr'
import { getPublicEnv } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * 瀏覽器端 Supabase client（Client Components 用）。
 * 只持有 anon key，所有存取受 RLS 保護（TECH §2）。
 */
export function createClient() {
  const env = getPublicEnv()
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
