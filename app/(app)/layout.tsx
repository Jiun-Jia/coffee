import Link from 'next/link'
import { Coffee } from 'lucide-react'
import { MobileNav } from '@/components/layout/mobile-nav'
import { SidebarNav } from '@/components/layout/sidebar-nav'

// 側邊欄底部的使用者區塊由 AUTH-10（user-nav.tsx）掛入。
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
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
          <div className="px-2">{/* AUTH-10: user-nav 插槽 */}</div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
