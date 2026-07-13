import { createAdminClient } from '@/lib/supabase/admin'

/**
 * VIZ-14：Supabase Free 專案閒置 7 天會暫停（TECH §3.2），
 * 由 vercel.json 的 cron 每日打一次輕量查詢保持活躍。
 * 以 CRON_SECRET 驗證（Vercel cron 會自動帶 Authorization header）。
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()
  const { count, error } = await admin
    .from('flavor_tags')
    .select('id', { count: 'exact', head: true })
    .eq('scope', 'system')

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true, systemTags: count })
}
