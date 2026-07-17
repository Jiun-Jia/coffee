'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type CompareOption = {
  id: string
  label: string
}

/**
 * FR-17 對照頁的左右兩杯選擇器（CMP-2）：
 * 換任一側即以 searchParams 重新載入（server 端重取資料）。
 */
export function ComparePicker({
  side,
  options,
  currentId,
}: {
  side: 'a' | 'b'
  options: CompareOption[]
  currentId?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <Select
      value={currentId ?? ''}
      onValueChange={(id) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set(side, id)
        router.push(`/brews/compare?${params.toString()}`)
      }}
    >
      <SelectTrigger
        className="w-full"
        aria-label={`選擇第${side === 'a' ? '一' : '二'}杯`}
      >
        <SelectValue
          placeholder={`選擇${side === 'a' ? '左' : '右'}邊的沖煮…`}
        />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
