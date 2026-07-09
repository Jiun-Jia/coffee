'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Loader2, Plus, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
import { createUserTag } from '@/app/(app)/settings/actions'

export type TagOption = { id: string; name: string; category: string }

/**
 * BREW-8/9：風味標籤多選 combobox（FR-5）。
 * - 依分類分組（system 標籤照 PRD §8；自訂標籤歸「自訂」）
 * - 搜尋無結果時可「建立自訂標籤」或「建立並提交建議加入內建」（D18）
 * - 選中的以 Badge chips 顯示、可點 X 移除
 */
export function FlavorTagSelect({
  options,
  value,
  onChange,
}: {
  options: TagOption[]
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  // 本地新增的自訂標籤（server revalidate 前先併入選項，BEAN-9 同模式）
  const [localTags, setLocalTags] = useState<TagOption[]>([])

  const allOptions = useMemo(() => {
    const seen = new Set(options.map((o) => o.id))
    return [...options, ...localTags.filter((t) => !seen.has(t.id))]
  }, [options, localTags])

  const byId = useMemo(
    () => new Map(allOptions.map((o) => [o.id, o])),
    [allOptions],
  )

  const grouped = useMemo(() => {
    const groups = new Map<string, TagOption[]>()
    for (const opt of allOptions) {
      const list = groups.get(opt.category) ?? []
      list.push(opt)
      groups.set(opt.category, list)
    }
    return [...groups.entries()]
  }, [allOptions])

  const trimmed = search.trim()
  const exactExists = allOptions.some((o) => o.name === trimmed)

  function toggle(id: string) {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    )
  }

  async function handleCreate(alsoSuggest: boolean) {
    if (!trimmed || creating) return
    setCreating(true)
    const result = await createUserTag(trimmed, alsoSuggest)
    setCreating(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setLocalTags((prev) => [...prev, result.tag])
    if (!value.includes(result.tag.id)) onChange([...value, result.tag.id])
    setSearch('')
    toast.success(
      alsoSuggest
        ? `已建立「${result.tag.name}」並提交建議`
        : `已建立自訂標籤「${result.tag.name}」`,
    )
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((id) => {
            const tag = byId.get(id)
            if (!tag) return null
            return (
              <Badge key={id} variant="secondary" className="gap-1">
                {tag.name}
                <button
                  type="button"
                  aria-label={`移除 ${tag.name}`}
                  onClick={() => toggle(id)}
                  className="hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="text-muted-foreground w-full justify-between font-normal"
          >
            {value.length > 0 ? `已選 ${value.length} 個標籤` : '選擇風味標籤…'}
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput
              placeholder="搜尋或輸入新標籤…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty className="py-3 text-center text-sm">
                沒有符合的標籤
              </CommandEmpty>
              {grouped.map(([category, tags]) => (
                <CommandGroup key={category} heading={category}>
                  {tags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => toggle(tag.id)}
                    >
                      <Check
                        className={cn(
                          'size-4',
                          value.includes(tag.id) ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {tag.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              {trimmed && !exactExists && (
                <CommandGroup heading="找不到？">
                  <CommandItem
                    value={`__create__${trimmed}`}
                    disabled={creating}
                    onSelect={() => handleCreate(false)}
                  >
                    {creating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    建立自訂標籤「{trimmed}」
                  </CommandItem>
                  <CommandItem
                    value={`__suggest__${trimmed}`}
                    disabled={creating}
                    onSelect={() => handleCreate(true)}
                  >
                    <Send className="size-4" />
                    建立並提交建議加入內建
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
