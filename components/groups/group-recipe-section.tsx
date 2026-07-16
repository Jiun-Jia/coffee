'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, CupSoda, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CopyRecipeDialog } from '@/components/brews/copy-recipe-dialog'
import {
  approveGroupRecipe,
  deleteRecipe,
  removeGroupRecipeSubmission,
} from '@/app/(app)/brews/recipes/actions'

export type GroupRecipeItem = {
  id: string
  name: string
  summary: string
  status: 'pending' | 'approved'
  user_id: string
  submitter: string
}

/**
 * FR-14.5 群組配方列（群組內頁）：
 * 待審核＝管理者核可/退回、提交者撤回；
 * 已生效＝全員可沖煮/複製到我的，建立者可編輯/刪除（同器材權限矩陣）。
 */
function GroupRecipeRow({
  item,
  canReview,
  canManage,
  myUserId,
}: {
  item: GroupRecipeItem
  canReview: boolean
  canManage: boolean
  myUserId: string
}) {
  const [busy, setBusy] = useState(false)
  const pending = item.status === 'pending'

  async function onApprove() {
    setBusy(true)
    const result = await approveGroupRecipe(item.id)
    setBusy(false)
    if (!result.ok) toast.error(result.error)
    else toast.success(`「${item.name}」已生效，全員沖群組豆時可載入`)
  }

  async function onRemovePending(kind: '退回' | '撤回') {
    setBusy(true)
    const result = await removeGroupRecipeSubmission(item.id)
    setBusy(false)
    if (!result.ok) toast.error(result.error)
    else toast.success(`已${kind}「${item.name}」（提交者的個人配方不受影響）`)
  }

  async function onDelete() {
    setBusy(true)
    const result = await deleteRecipe(item.id)
    setBusy(false)
    if (!result.ok) toast.error(result.error)
    else toast.success(`已刪除群組配方「${item.name}」`)
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{item.name}</span>
          {pending && <Badge variant="outline">待審核</Badge>}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {[item.summary, `推薦者 ${item.submitter}`].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {pending ? (
          <>
            {canReview && (
              <Button size="sm" disabled={busy} onClick={onApprove}>
                <Check className="size-4" />
                核可
              </Button>
            )}
            {(canReview || item.user_id === myUserId) && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => onRemovePending(canReview ? '退回' : '撤回')}
              >
                <X className="size-4" />
                {canReview ? '退回' : '撤回'}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/brews/new?recipeId=${item.id}`}>
                <CupSoda className="size-4" />
                沖煮
              </Link>
            </Button>
            <CopyRecipeDialog recipeId={item.id} recipeName={item.name} />
            {canManage && (
              <>
                <Button asChild variant="ghost" size="sm" aria-label={`編輯 ${item.name}`}>
                  <Link href={`/brews/recipes/${item.id}/edit`}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      aria-label={`刪除 ${item.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>刪除群組配方「{item.name}」？</AlertDialogTitle>
                      <AlertDialogDescription>
                        成員將無法再載入這個配方（成員已複製的個人配方不受影響）。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete}>刪除</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** 群組配方區：待審核在前、已生效在後。 */
export function GroupRecipeSection({
  recipes,
  isManager,
  isOwner,
  myUserId,
}: {
  recipes: GroupRecipeItem[]
  isManager: boolean
  isOwner: boolean
  myUserId: string
}) {
  const pending = recipes.filter((r) => r.status === 'pending')
  const approved = recipes.filter((r) => r.status === 'approved')

  return (
    <div className="space-y-2">
      {recipes.length === 0 && (
        <p className="text-muted-foreground text-sm">
          還沒有群組配方。到「沖煮 → 配方」把你的個人配方「推薦」給這個群組。
        </p>
      )}
      {pending.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs">
            待審核（{pending.length}）
          </p>
          {pending.map((r) => (
            <GroupRecipeRow
              key={r.id}
              item={r}
              canReview={isManager}
              canManage={isOwner}
              myUserId={myUserId}
            />
          ))}
        </div>
      )}
      {approved.map((r) => (
        <GroupRecipeRow
          key={r.id}
          item={r}
          canReview={isManager}
          canManage={isOwner}
          myUserId={myUserId}
        />
      ))}
    </div>
  )
}
