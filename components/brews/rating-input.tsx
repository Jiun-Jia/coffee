'use client'

import { cn } from '@/lib/utils'

/**
 * BREW-4：1–5 評分元件。點選同分可清除（選填欄位）；
 * 鍵盤 1–5 直接選分、0/Backspace 清除（DESIGN §B.4）。
 */
export function RatingInput({
  value,
  onChange,
  allowClear = true,
  'aria-label': ariaLabel,
}: {
  value?: number
  onChange: (value: number | undefined) => void
  allowClear?: boolean
  'aria-label'?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex gap-1"
      onKeyDown={(e) => {
        if (/^[1-5]$/.test(e.key)) {
          e.preventDefault()
          onChange(Number(e.key))
        } else if (allowClear && (e.key === '0' || e.key === 'Backspace')) {
          e.preventDefault()
          onChange(undefined)
        }
      }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} 分`}
          onClick={() => onChange(allowClear && value === n ? undefined : n)}
          className={cn(
            'size-8 rounded-full border text-sm transition-colors',
            value != null && n <= value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'text-muted-foreground hover:border-primary/50',
          )}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
