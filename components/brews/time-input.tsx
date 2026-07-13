'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatSecondsToMSS, parseTimeToSeconds } from '@/lib/format'

const MINUTE_OPTIONS = Array.from({ length: 16 }, (_, i) => i) // 0–15 分
const SECOND_STEPS = Array.from({ length: 12 }, (_, i) => i * 5) // 0,5,…,55

/**
 * BREW-5：時間輸入（混合式）。
 * 左側文字框接受 "m:ss" 或純秒數（桌面打字快）；
 * 右側分/秒下拉可點選（手機好按，秒以 5 秒為級距）。
 * 兩邊雙向同步，RHF 值一律是 int 秒（Q4）。
 */
export function TimeInput({
  value,
  onChange,
  placeholder = 'm:ss',
}: {
  value?: number
  onChange: (value: number | undefined) => void
  placeholder?: string
}) {
  const [text, setText] = useState(
    value != null ? formatSecondsToMSS(value) : '',
  )
  const [invalid, setInvalid] = useState(false)

  const minutes = value != null ? Math.floor(value / 60) : undefined
  const seconds = value != null ? value % 60 : undefined
  // 手動輸入的非 5 倍數秒（如 2:47）也要出現在下拉中
  const secondOptions =
    seconds != null && !SECOND_STEPS.includes(seconds)
      ? [...SECOND_STEPS, seconds].sort((a, b) => a - b)
      : SECOND_STEPS

  function commit(total: number | undefined) {
    setInvalid(false)
    onChange(total)
    setText(total != null ? formatSecondsToMSS(total) : '')
  }

  function commitText() {
    const raw = text.trim()
    if (raw === '') return commit(undefined)
    const parsed = parseTimeToSeconds(raw)
    if (parsed === null) {
      setInvalid(true)
      onChange(undefined)
      return
    }
    commit(parsed)
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <Input
          value={text}
          inputMode="numeric"
          placeholder={placeholder}
          aria-invalid={invalid}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          className="min-w-0 flex-1"
        />
        <Select
          value={minutes != null ? String(minutes) : ''}
          onValueChange={(v) => commit(Number(v) * 60 + (seconds ?? 0))}
        >
          <SelectTrigger className="w-[4.5rem] shrink-0" aria-label="分">
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
          onValueChange={(v) => commit((minutes ?? 0) * 60 + Number(v))}
        >
          <SelectTrigger className="w-[4.5rem] shrink-0" aria-label="秒">
            <SelectValue placeholder="秒" />
          </SelectTrigger>
          <SelectContent>
            {secondOptions.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s} 秒
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {invalid && (
        <p className="text-destructive text-sm">
          格式：分:秒（如 2:30）或純秒數
        </p>
      )}
    </div>
  )
}
