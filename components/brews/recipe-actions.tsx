'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CupSoda, Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deleteRecipe } from '@/app/(app)/brews/recipes/actions'

/** RCP-4 配方列的操作：用此配方沖煮 / 編輯 / 刪除。 */
export function RecipeActions({
  recipeId,
  recipeName,
}: {
  recipeId: string
  recipeName: string
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function onDelete() {
    setDeleting(true)
    const result = await deleteRecipe(recipeId)
    if (!result.ok) {
      toast.error(result.error)
      setDeleting(false)
      return
    }
    toast.success(`配方「${recipeName}」已刪除`)
    router.refresh()
  }

  return (
    <div className="flex justify-end gap-1">
      <Button asChild size="sm">
        <Link href={`/brews/new?recipeId=${recipeId}`}>
          <CupSoda className="size-4" />
          沖煮
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={`/brews/recipes/${recipeId}/edit`}>
          <Pencil className="size-4" />
          編輯
        </Link>
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`刪除配方 ${recipeName}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>刪除配方「{recipeName}」？</AlertDialogTitle>
            <AlertDialogDescription>
              此動作無法復原（已沖的紀錄不受影響）。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              刪除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
