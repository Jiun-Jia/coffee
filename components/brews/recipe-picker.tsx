'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type RecipePickerSection = {
  /** 分區鍵：'personal' 或群組 id */
  key: string
  label: string
  recipes: { id: string; name: string }[]
}

/**
 * RCP-3／FR-14.6：新增沖煮頁的「載入配方」下拉，分區顯示
 * （個人配方／各群組配方；群組配方僅在沖該群組豆時列出——
 * 分區內容由 server 端依 beanId 過濾）。
 * 選擇後以 searchParams 重新載入頁面（與「複製上一杯」同一套 key 重掛機制）。
 */
export function RecipePicker({
  sections,
  currentId,
  beanId,
}: {
  sections: RecipePickerSection[]
  currentId?: string
  beanId?: string
}) {
  const router = useRouter()
  const visible = sections.filter((s) => s.recipes.length > 0)
  if (visible.length === 0) return null

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
      <SelectTrigger className="w-44" aria-label="載入配方">
        <SelectValue placeholder="載入配方…" />
      </SelectTrigger>
      <SelectContent>
        {visible.map((section) => (
          <SelectGroup key={section.key}>
            <SelectLabel>{section.label}</SelectLabel>
            {section.recipes.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
