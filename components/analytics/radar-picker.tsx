'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  SensoryRadar,
  type RadarSeries,
} from '@/components/charts/sensory-radar'

const MAX_SERIES = 5

/**
 * A5 的沖煮多選器（上限 5 筆）。
 * 色槽在「加入時」指派且移除其他筆不變動 —— 顏色跟隨實體，不隨排序重繪。
 */
export function RadarPicker({
  options,
}: {
  options: (RadarSeries & { hint?: string })[]
}) {
  const [open, setOpen] = useState(false)
  // id → slot（加入時取最小空槽，移除不影響其他筆）
  const [selection, setSelection] = useState<{ id: string; slot: number }[]>(
    options.length > 0 ? [{ id: options[0].id, slot: 0 }] : [],
  )

  function toggle(id: string) {
    setSelection((prev) => {
      const existing = prev.find((s) => s.id === id)
      if (existing) return prev.filter((s) => s.id !== id)
      if (prev.length >= MAX_SERIES) return prev
      const used = new Set(prev.map((s) => s.slot))
      let slot = 0
      while (used.has(slot)) slot++
      return [...prev, { id, slot }]
    })
  }

  const series = selection
    .map(({ id, slot }) => {
      const opt = options.find((o) => o.id === id)
      return opt ? { ...opt, slot } : null
    })
    .filter(Boolean) as (RadarSeries & { slot: number })[]

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            className="text-muted-foreground justify-between font-normal"
          >
            選擇沖煮（{selection.length}/{MAX_SERIES}）
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <Command>
            <CommandInput placeholder="搜尋沖煮…" />
            <CommandList>
              <CommandEmpty className="py-3 text-center text-sm">
                沒有符合的沖煮
              </CommandEmpty>
              <CommandGroup>
                {options.map((opt) => {
                  const selected = selection.some((s) => s.id === opt.id)
                  const disabled = !selected && selection.length >= MAX_SERIES
                  return (
                    <CommandItem
                      key={opt.id}
                      value={`${opt.label} ${opt.hint ?? ''}`}
                      disabled={disabled}
                      onSelect={() => toggle(opt.id)}
                    >
                      <Check
                        className={cn(
                          'size-4',
                          selected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="truncate">{opt.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <SensoryRadar series={series} />
    </div>
  )
}
