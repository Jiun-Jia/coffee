'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Loader2, Pencil, Trash2 } from 'lucide-react'
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
import { deleteBrew } from '@/app/(app)/brews/actions'

/** P4 的操作列：編輯 / 複製為新紀錄（BREW-15）/ 刪除（BREW-16）。 */
export function BrewActions({ brewId }: { brewId: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function onDelete() {
    setDeleting(true)
    const result = await deleteBrew(brewId)
    if (!result.ok) {
      toast.error(result.error)
      setDeleting(false)
      return
    }
    toast.success('沖煮紀錄已刪除')
    router.push('/brews')
  }

  return (
    <div className="flex gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/brews/${brewId}/edit`}>
          <Pencil className="size-4" />
          編輯
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={`/brews/new?copyFrom=${brewId}`}>
          <Copy className="size-4" />
          複製為新紀錄
        </Link>
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Trash2 className="size-4" />
            刪除
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>刪除這筆沖煮紀錄？</AlertDialogTitle>
            <AlertDialogDescription>
              此動作無法復原（豆子不受影響）。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <Button variant="destructive" onClick={onDelete} disabled={deleting}>
              {deleting && <Loader2 className="size-4 animate-spin" />}
              刪除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
