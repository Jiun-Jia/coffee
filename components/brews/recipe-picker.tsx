'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * RCP-3：新增沖煮頁的「載入配方」下拉。
 * 選擇後以 searchParams 重新載入頁面（server 端預填，
 * 與「複製上一杯」同一套 key 重掛機制）。
 */
export function RecipePicker({
  recipes,
  currentId,
  beanId,
}: {
  recipes: { id: string; name: string }[]
  currentId?: string
  beanId?: string
}) {
  const router = useRouter()
  if (recipes.length === 0) return null

  return (
    <Select
      value={currentId ?? ''}
      onValueChange={(id) => {
        const params = new URLSearchParams()
        params.set('recipeId', id)
        if (beanId) params.set('beanId', beanId)
        router.push(`/brews/new?${params.toString()}`)
      }}
    >
      <SelectTrigger className="w-40" aria-label="載入配方">
        <SelectValue placeholder="載入配方…" />
      </SelectTrigger>
      <SelectContent>
        {recipes.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
