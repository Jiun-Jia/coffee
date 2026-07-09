'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { countBeanBrews, deleteBean } from '@/app/(app)/beans/actions'

/**
 * BEAN-6：刪除豆子 type-to-confirm 對話框（FR-2.3）。
 * 開啟時即時查連帶沖煮筆數；輸入完全一致豆名（trim，含大小寫）才可刪；
 * server 端會再次比對豆名。
 */
export function DeleteBeanDialog({
  beanId,
  beanName,
}: {
  beanId: string
  beanName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [brewCount, setBrewCount] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const nameMatches = confirmName.trim() === beanName

  // 重置放在事件處理（非 effect），effect 只負責非同步查筆數
  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setConfirmName('')
      setBrewCount(null)
    }
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false
    countBeanBrews(beanId).then((count) => {
      if (!cancelled) setBrewCount(count)
    })
    return () => {
      cancelled = true
    }
  }, [open, beanId])

  async function onDelete() {
    setDeleting(true)
    const result = await deleteBean(beanId, confirmName)
    if (!result.ok) {
      toast.error(result.error)
      setDeleting(false)
      return
    }
    toast.success(`已刪除「${beanName}」`)
    setOpen(false)
    router.push('/beans')
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="size-4" />
          刪除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>刪除豆子？</AlertDialogTitle>
          <AlertDialogDescription>
            這將永久刪除「{beanName}」
            {brewCount === null
              ? '（正在確認沖煮筆數…）'
              : brewCount > 0
                ? `及其 ${brewCount} 筆沖煮紀錄`
                : ''}
            ，無法復原。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-bean-name">請輸入豆名以確認</Label>
          <Input
            id="confirm-bean-name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={beanName}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!nameMatches || deleting || brewCount === null}
            onClick={onDelete}
          >
            {deleting && <Loader2 className="size-4 animate-spin" />}
            刪除
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
