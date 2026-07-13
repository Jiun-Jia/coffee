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
 * BREW-5：時間輸入（混合式，雙向同步）。
 * - 文字框打字時「可解析就即時提交」→ 分/秒下拉立刻跟著動；
 *   失焦才把顯示正規化成 m:ss（打字中不改字串，避免游標跳動）。
 * - 下拉點選 → 提交秒數並回寫文字框。
 * RHF 值一律是 int 秒（Q4）。
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

  // 外部 value 變動（下拉提交、RHF reset、複製帶入）→ 同步文字框。
  // 「render 中調整 state」是 React 官方的 derived-state 模式（compiler 安全）；
  // 若目前文字已代表同一個值（打字中）則不改字串。
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    const trimmed = text.trim()
    const textParsed =
      trimmed === '' ? undefined : (parseTimeToSeconds(trimmed) ?? undefined)
    if (textParsed !== value) {
      setText(value != null ? formatSecondsToMSS(value) : '')
      setInvalid(false)
    }
  }

  const minutes = value != null ? Math.floor(value / 60) : undefined
  const seconds = value != null ? value % 60 : undefined
  // 手動輸入的非 5 倍數秒（如 2:47）也要出現在下拉中
  const secondOptions =
    seconds != null && !SECOND_STEPS.includes(seconds)
      ? [...SECOND_STEPS, seconds].sort((a, b) => a - b)
      : SECOND_STEPS

  /** 打字：可解析就即時提交（下拉即時跟動），解析失敗留到失焦再標錯 */
  function handleTextChange(raw: string) {
    setText(raw)
    const trimmed = raw.trim()
    if (trimmed === '') {
      setInvalid(false)
      onChange(undefined)
      return
    }
    const parsed = parseTimeToSeconds(trimmed)
    if (parsed !== null) {
      setInvalid(false)
      onChange(parsed)
    }
  }

  /** 失焦：正規化顯示為 m:ss，無法解析才標錯 */
  function handleBlur() {
    const trimmed = text.trim()
    if (trimmed === '') return
    const parsed = parseTimeToSeconds(trimmed)
    if (parsed === null) {
      setInvalid(true)
      onChange(undefined)
      return
    }
    setText(formatSecondsToMSS(parsed))
  }

  /** 下拉點選：提交並回寫文字框 */
  function commitFromSelect(total: number) {
    setInvalid(false)
    onChange(total)
    setText(formatSecondsToMSS(total))
  }

  return (
    <div className="space-y-1">
      {/* flex-wrap + min-w：容器過窄時下拉換行，文字框永遠保有可視寬度 */}
      <div className="flex flex-wrap gap-1">
        <Input
          value={text}
          inputMode="numeric"
          placeholder={placeholder}
          aria-invalid={invalid}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleBlur}
          className="min-w-20 flex-1"
        />
        <Select
          value={minutes != null ? String(minutes) : ''}
          onValueChange={(v) => commitFromSelect(Number(v) * 60 + (seconds ?? 0))}
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
          onValueChange={(v) => commitFromSelect((minutes ?? 0) * 60 + Number(v))}
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
