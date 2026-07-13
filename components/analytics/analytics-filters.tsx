'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROAST_LEVEL_OPTIONS } from '@/lib/validations/enums'

const ALL = '__all'

/** VIZ-8：P9 篩選列（豆子/焙度/產地/日期，與 P3 用相同的 URL 參數名） */
export function AnalyticsFilters({
  beans,
  origins,
}: {
  beans: { id: string; label: string }[]
  origins: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const get = (key: string) => searchParams.get(key) ?? ''

  function setParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const hasFilters = [...searchParams.keys()].length > 0

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={get('bean') || ALL}
        onValueChange={(v) => setParams({ bean: v === ALL ? '' : v })}
      >
        <SelectTrigger size="sm" className="w-40">
          <SelectValue placeholder="豆子" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>豆子：全部</SelectItem>
          {beans.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={get('roast') || ALL}
        onValueChange={(v) => setParams({ roast: v === ALL ? '' : v })}
      >
        <SelectTrigger size="sm" className="w-32">
          <SelectValue placeholder="焙度" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>焙度：全部</SelectItem>
          {ROAST_LEVEL_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={get('origin') || ALL}
        onValueChange={(v) => setParams({ origin: v === ALL ? '' : v })}
      >
        <SelectTrigger size="sm" className="w-36">
          <SelectValue placeholder="產地" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>產地：全部</SelectItem>
          {origins.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="date"
        value={get('from')}
        onChange={(e) => setParams({ from: e.target.value })}
        className="h-8 w-auto"
        aria-label="開始日期"
      />
      <span className="text-muted-foreground text-sm">—</span>
      <Input
        type="date"
        value={get('to')}
        onChange={(e) => setParams({ to: e.target.value })}
        className="h-8 w-auto"
        aria-label="結束日期"
      />
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          <RotateCcw className="size-4" />
          重設
        </Button>
      )}
    </div>
  )
}
