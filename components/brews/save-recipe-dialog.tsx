'use client'

import { useState } from 'react'
import { BookmarkPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { saveBrewAsRecipe } from '@/app/(app)/brews/recipes/actions'

/**
 * RCP-2：把這筆沖煮的器材/變因/分段快照成配方（FR-14.1）。
 * 他人的（群組可見）沖煮也能存——「抄朋友的配方」正是設計情境。
 */
export function SaveRecipeDialog({
  brewId,
  suggestedName,
}: {
  brewId: string
  /** 預設配方名（豆名等），可改 */
  suggestedName?: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(suggestedName ?? '')
  const [saving, setSaving] = useState(false)

  async function onSave() {
    setSaving(true)
    const result = await saveBrewAsRecipe({ brew_id: brewId, name })
    setSaving(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`已存成配方「${name.trim()}」，可在沖煮頁的「配方」分頁管理`)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookmarkPlus className="size-4" />
          存成配方
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>存成配方</DialogTitle>
          <DialogDescription>
            快照這杯的器材、變因與注水分段（不含豆子與評分），之後新增沖煮時可一鍵載入。
          </DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="配方名稱（例：四六沖法）"
          maxLength={60}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim() && !saving) {
              e.preventDefault()
              onSave()
            }
          }}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button onClick={onSave} disabled={!name.trim() || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
