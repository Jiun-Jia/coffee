import Link from 'next/link'
import { cn } from '@/lib/utils'

/** 沖煮頁的子分頁：紀錄 / 配方（RCP-4，§6 決議-1：配方入口在沖煮側） */
export function BrewsTabs({ active }: { active: 'brews' | 'recipes' }) {
  const tabs = [
    { key: 'brews', href: '/brews', label: '紀錄' },
    { key: 'recipes', href: '/brews/recipes', label: '配方' },
  ] as const

  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
            active === tab.key
              ? 'border-primary text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground border-transparent',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
