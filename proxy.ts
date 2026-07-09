import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

/**
 * Next.js 16 的 Proxy（前身為 Middleware）：
 * 每個請求先經過這裡刷新 Supabase session 並做樂觀的登入導向。
 * 真正的資料防線在 RLS 與各 Server Action 的驗證（proxy 只是第一道）。
 */
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // 排除靜態資源與圖片，其餘全部經過（認證建議全路由）
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
