'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MINUTE_OPTIONS = Array.from({ length: 16 }, (_, i) => i) // 0–15 分
const SECOND_OPTIONS = Array.from({ length: 60 }, (_, i) => i) // 0–59 秒

/**
 * BREW-5：時間輸入（分/秒下拉，實測後拿掉文字框、秒為每秒一格）。
 * 選填欄位：已有值時顯示清除鈕可清回未填。RHF 值一律是 int 秒（Q4）。
 */
export function TimeInput({
  value,
  onChange,
}: {
  value?: number
  onChange: (value: number | undefined) => void
}) {
  const minutes = value != null ? Math.floor(value / 60) : undefined
  const seconds = value != null ? value % 60 : undefined

  return (
    <div className="flex items-center gap-1">
      <Select
        value={minutes != null ? String(minutes) : ''}
        onValueChange={(v) => onChange(Number(v) * 60 + (seconds ?? 0))}
      >
        <SelectTrigger className="flex-1" aria-label="分">
          <SelectValue placeholder="分" />
        </SelectTrigger>
        <SelectContent>
          {MINUTE_OPTIONS.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {m} 分
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={seconds != null ? String(seconds) : ''}
        onValueChange={(v) => onChange((minutes ?? 0) * 60 + Number(v))}
      >
        <SelectTrigger className="flex-1" aria-label="秒">
          <SelectValue placeholder="秒" />
        </SelectTrigger>
        <SelectContent>
          {SECOND_OPTIONS.map((s) => (
            <SelectItem key={s} value={String(s)}>
              {s} 秒
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value != null && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="清除時間"
          className="shrink-0"
          onClick={() => onChange(undefined)}
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  )
}
