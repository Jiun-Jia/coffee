import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type CurrentProfile = {
  id: string
  username: string
  email: string | null
}

/**
 * AUTH-9：取得目前登入者的 profile。
 * React cache() 讓同一次 render 中多處呼叫只查一次。
 * 孤兒帳號（有 auth 無 profile，理論上不會發生）降級為 email 前綴顯示，不白屏。
 */
export const getCurrentProfile = cache(
  async (): Promise<CurrentProfile | null> => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', user.id)
      .maybeSingle()

    return {
      id: user.id,
      username: profile?.username ?? user.email?.split('@')[0] ?? '使用者',
      email: user.email ?? null,
    }
  },
)
