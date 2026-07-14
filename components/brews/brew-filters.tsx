'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { RotateCcw, Search } from 'lucide-react'
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

export type FilterOptions = {
  beans: { id: string; label: string }[]
  origins: string[]
  processes: string[]
  roasters: string[]
  drippers: string[]
  tags: { id: string; name: string }[]
}

function FilterSelect({
  placeholder,
  value,
  options,
  onChange,
}: {
  placeholder: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? '' : v)}>
      <SelectTrigger size="sm" className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}：全部</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * BREW-13：P3 / P9 共用篩選列（FR-7、PRD §9）。
 * 全部條件序列化至 URL searchParams（可分享、可返回）；
 * 下拉選項由使用者既有資料 distinct 產生。
 * scopeToggle：P9 專用的「只看我的/含群組成員」切換（FR-10.7）。
 */
export function BrewFilters({
  options,
  scopeToggle = false,
}: {
  options: FilterOptions
  scopeToggle?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const get = (key: string) => searchParams.get(key) ?? ''
  const [q, setQ] = useState(get('q'))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function setParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // 關鍵字：debounce 400ms 寫回 URL
  function onSearchChange(value: string) {
    setQ(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setParams({ q: value.trim() }), 400)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const hasFilters = [...searchParams.keys()].some((k) => k !== 'sort' && k !== 'dir')

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜尋豆名 / 店家 / 備註…"
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {scopeToggle && (
          <Select
            value={searchParams.get('scope') || 'mine'}
            onValueChange={(v) => setParams({ scope: v === 'mine' ? '' : v })}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mine">只看我的</SelectItem>
              <SelectItem value="all">含群組成員</SelectItem>
            </SelectContent>
          </Select>
        )}
        <FilterSelect
          placeholder="豆子"
          value={get('bean')}
          options={options.beans.map((b) => ({ value: b.id, label: b.label }))}
          onChange={(v) => setParams({ bean: v })}
        />
        <FilterSelect
          placeholder="焙度"
          value={get('roast')}
          options={ROAST_LEVEL_OPTIONS}
          onChange={(v) => setParams({ roast: v })}
        />
        <FilterSelect
          placeholder="產地"
          value={get('origin')}
          options={options.origins.map((o) => ({ value: o, label: o }))}
          onChange={(v) => setParams({ origin: v })}
        />
        <FilterSelect
          placeholder="處理法"
          value={get('process')}
          options={options.processes.map((p) => ({ value: p, label: p }))}
          onChange={(v) => setParams({ process: v })}
        />
        <FilterSelect
          placeholder="店家"
          value={get('roaster')}
          options={options.roasters.map((r) => ({ value: r, label: r }))}
          onChange={(v) => setParams({ roaster: v })}
        />
        <FilterSelect
          placeholder="濾杯"
          value={get('dripper')}
          options={options.drippers.map((d) => ({ value: d, label: d }))}
          onChange={(v) => setParams({ dripper: v })}
        />
        <FilterSelect
          placeholder="標籤"
          value={get('tag')}
          options={options.tags.map((t) => ({ value: t.id, label: t.name }))}
          onChange={(v) => setParams({ tag: v })}
        />
        <FilterSelect
          placeholder="喜好度"
          value={get('minOverall')}
          options={[5, 4, 3, 2].map((n) => ({
            value: String(n),
            label: `≥ ${'★'.repeat(n)}`,
          }))}
          onChange={(v) => setParams({ minOverall: v })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => {
              setQ('')
              router.replace(pathname, { scroll: false })
            }}
          >
            <RotateCcw className="size-4" />
            重設
          </Button>
        )}
      </div>
    </div>
  )
}
