import Link from 'next/link'
import { Coffee } from 'lucide-react'
import { UserNav } from '@/components/auth/user-nav'
import { MobileNav } from '@/components/layout/mobile-nav'
import { SidebarNav } from '@/components/layout/sidebar-nav'
import { getCurrentProfile } from '@/lib/auth/profile'

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // proxy.ts 已擋未登入；這裡取 username 供側邊欄顯示（AUTH-9/10）
  const profile = await getCurrentProfile()
  const userNav = <UserNav username={profile?.username ?? '使用者'} />

  return (
    <div className="flex min-h-svh w-full">
      <aside className="bg-sidebar sticky top-0 hidden h-svh w-56 shrink-0 flex-col border-r md:flex">
        <div className="border-b px-4 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <Coffee className="size-5" />
            Brewlog
          </Link>
        </div>
        <div className="flex flex-1 flex-col justify-between py-3">
          <SidebarNav />
          <div className="px-2">{userNav}</div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav userSlot={userNav} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
