'use client'

import { useState } from 'react'
import { Loader2, UsersRound } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { submitRecipeToGroup } from '@/app/(app)/brews/recipes/actions'

/**
 * FR-14.5 推薦給群組：快照複製一份送審（個人原件保留）。
 * 管理者推薦＝直接生效（自案自核，同器材慣例）。
 */
export function SubmitRecipeDialog({
  recipeId,
  recipeName,
  groups,
}: {
  recipeId: string
  recipeName: string
  groups: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [groupId, setGroupId] = useState('')
  const [busy, setBusy] = useState(false)

  if (groups.length === 0) return null

  async function onSubmit() {
    setBusy(true)
    const result = await submitRecipeToGroup(recipeId, groupId)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    const groupName = groups.find((g) => g.id === groupId)?.name ?? ''
    toast.success(
      result.pending
        ? `已推薦「${recipeName}」給「${groupName}」，待管理者核可`
        : `「${recipeName}」已成為「${groupName}」的群組配方`,
    )
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`推薦配方 ${recipeName} 給群組`}>
          <UsersRound className="size-4" />
          推薦
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>推薦「{recipeName}」給群組</DialogTitle>
          <DialogDescription>
            會複製一份送交群組管理者審核（你的個人配方保留不變）；
            核可後全體成員沖群組豆時可載入。
          </DialogDescription>
        </DialogHeader>
        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger className="w-full" aria-label="選擇群組">
            <SelectValue placeholder="選擇群組" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            取消
          </Button>
          <Button onClick={onSubmit} disabled={!groupId || busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            推薦
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
