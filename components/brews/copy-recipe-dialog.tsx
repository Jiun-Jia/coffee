'use client'

import { useState } from 'react'
import { CopyPlus, Loader2 } from 'lucide-react'
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
import { copyGroupRecipeToMine } from '@/app/(app)/brews/recipes/actions'

/** FR-14.7 把群組配方複製成自己的個人配方（沖個人豆用）。 */
export function CopyRecipeDialog({
  recipeId,
  recipeName,
}: {
  recipeId: string
  recipeName: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(recipeName)
  const [busy, setBusy] = useState(false)

  async function onCopy() {
    setBusy(true)
    const result = await copyGroupRecipeToMine(recipeId, name)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`已複製為個人配方「${name.trim()}」`)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`複製 ${recipeName} 到我的配方`}>
          <CopyPlus className="size-4" />
          複製到我的
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>複製到我的配方</DialogTitle>
          <DialogDescription>
            複製一份為個人配方（與群組配方各自獨立），沖個人豆時也能載入。
          </DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="個人配方名稱"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim() && !busy) {
              e.preventDefault()
              onCopy()
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            取消
          </Button>
          <Button onClick={onCopy} disabled={!name.trim() || busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            複製
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
