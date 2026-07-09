'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Coffee, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { SidebarNav } from '@/components/layout/sidebar-nav'

export function MobileNav({ userSlot }: { userSlot?: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-background sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="開啟選單">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Coffee className="size-5" />
              Brewlog
            </SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col justify-between pt-2 pb-4">
            <SidebarNav onNavigate={() => setOpen(false)} />
            <div className="px-2">{userSlot}</div>
          </div>
        </SheetContent>
      </Sheet>
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
        <Coffee className="size-5" />
        Brewlog
      </Link>
    </header>
  )
}
