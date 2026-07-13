'use client'

import { useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * 下拉＋可自填的文字輸入：值永遠是純字串（DB 仍存 text）。
 * 用於處理法、濾杯/濾紙/手沖壺等「有常用清單但要保留彈性」的欄位。
 */
export function ComboboxInput({
  value,
  onChange,
  options,
  placeholder,
  emptyHint,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  /** 清單為空時顯示的提示（例如引導去設定頁建立） */
  emptyHint?: string
}) {
  const [open, setOpen] = useState(false)

  const query = value.trim().toLowerCase()
  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query))
    : options
  // 輸入的字剛好等於某選項時不用再顯示清單
  const visible = filtered.filter((o) => o !== value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Input
            value={value}
            placeholder={placeholder}
            onChange={(e) => {
              onChange(e.target.value)
              if (!open) setOpen(true)
            }}
            onFocus={() => options.length > 0 && setOpen(true)}
            className="pr-8"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            tabIndex={-1}
            aria-label="展開選項"
            className="absolute top-1/2 right-0 h-8 w-8 -translate-y-1/2"
            onClick={() => setOpen((o) => !o)}
          >
            <ChevronsUpDown className="size-3.5 opacity-50" />
          </Button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="max-h-56 w-[--radix-popover-trigger-width] overflow-y-auto p-1"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {options.length === 0 && emptyHint ? (
          <p className="text-muted-foreground px-2 py-1.5 text-sm">
            {emptyHint}
          </p>
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground px-2 py-1.5 text-sm">
            沒有符合的選項，可直接使用輸入的文字
          </p>
        ) : (
          visible.map((option) => (
            <button
              key={option}
              type="button"
              className={cn(
                'hover:bg-accent hover:text-accent-foreground w-full rounded-sm px-2 py-1.5 text-left text-sm',
              )}
              // mousedown 先於 input blur，避免點擊前選單先關閉
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(option)
                setOpen(false)
              }}
            >
              {option}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  )
}
