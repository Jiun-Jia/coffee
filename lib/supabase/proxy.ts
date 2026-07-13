import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getPublicEnv } from '@/lib/env'
import type { Database } from '@/types/database'

/** 認證頁：已登入者訪問時導回首頁 */
const AUTH_PAGES = ['/login', '/register', '/forgot-password']

/** 未登入也可存取的路徑（前綴比對） */
const PUBLIC_PATHS = [
  ...AUTH_PAGES,
  '/reset-password', // 需 recovery session，登入中也可訪問
  '/auth', // email 連結驗證入口（/auth/confirm）
  '/api/keepalive', // cron 保活（route 內以 CRON_SECRET 驗證）
]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

/**
 * proxy.ts 專用：刷新 session 並做樂觀的路由保護（AUTH-8）。
 *
 * 兩條鐵則（@supabase/ssr 最常見的坑，M3-PLAN 風險 #2）：
 * 1. 身分判斷一律 getUser()（向 Auth server 驗證），勿用 getSession()。
 * 2. 自行 redirect / 改寫 response 時，必須帶上 supabaseResponse 已寫入的
 *    cookies，否則 token 刷新結果遺失 → 使用者被隨機登出。
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const env = getPublicEnv()
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // 重要：createServerClient 與 getUser() 之間不要插入其他邏輯，
  // 否則 token 刷新可能未完成就被讀取。
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && !isPublicPath(pathname)) {
    // 未登入 → 導向登入頁，帶上原路徑供登入後返回（僅站內相對路徑）
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    if (pathname !== '/' && pathname !== '/dashboard') {
      url.searchParams.set('redirectTo', pathname)
    }
    const redirectResponse = NextResponse.redirect(url)
    // 複製 session cookies 到 redirect response（鐵則 2）
    supabaseResponse.cookies
      .getAll()
      .forEach((c) => redirectResponse.cookies.set(c))
    return redirectResponse
  }

  const isAuthPage = AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  if (user && isAuthPage) {
    // 已登入者訪認證頁 → 回首頁
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies
      .getAll()
      .forEach((c) => redirectResponse.cookies.set(c))
    return redirectResponse
  }

  return supabaseResponse
}
