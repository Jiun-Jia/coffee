'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { formatSecondsToMSS, parseTimeToSeconds } from '@/lib/format'

/**
 * BREW-5：時間輸入。接受 "m:ss" 或純秒數（"150"），
 * onBlur 正規化顯示為 m:ss，RHF 值一律是 int 秒（Q4）。
 */
export function TimeInput({
  value,
  onChange,
  placeholder = 'm:ss 或秒數',
}: {
  value?: number
  onChange: (value: number | undefined) => void
  placeholder?: string
}) {
  const [text, setText] = useState(
    value != null ? formatSecondsToMSS(value) : '',
  )
  const [invalid, setInvalid] = useState(false)

  function commit() {
    const raw = text.trim()
    if (raw === '') {
      setInvalid(false)
      onChange(undefined)
      return
    }
    const seconds = parseTimeToSeconds(raw)
    if (seconds === null) {
      setInvalid(true)
      onChange(undefined)
      return
    }
    setInvalid(false)
    setText(formatSecondsToMSS(seconds))
    onChange(seconds)
  }

  return (
    <div className="space-y-1">
      <Input
        value={text}
        inputMode="numeric"
        placeholder={placeholder}
        aria-invalid={invalid}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
      />
      {invalid && (
        <p className="text-destructive text-sm">
          格式：分:秒（如 2:30）或純秒數
        </p>
      )}
    </div>
  )
}
