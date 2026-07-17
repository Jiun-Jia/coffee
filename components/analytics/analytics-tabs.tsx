import Link from 'next/link'
import { cn } from '@/lib/utils'

/** 分析頁子分頁：總覽（A2–A5）／回顧（FR-20） */
export function AnalyticsTabs({ active }: { active: 'overview' | 'review' }) {
  const tabs = [
    { key: 'overview', href: '/analytics', label: '總覽' },
    { key: 'review', href: '/analytics/review', label: '回顧' },
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
