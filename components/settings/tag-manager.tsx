'use client'

import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createUserTag, deleteUserTag } from '@/app/(app)/settings/actions'

type MyTag = { id: string; name: string; usage_count: number }
type Suggestion = { id: string; name: string; status: string }

const STATUS_LABELS: Record<string, string> = {
  pending: '審核中',
  approved: '已加入內建',
  rejected: '未採用',
}

function DeleteTagButton({ tag }: { tag: MyTag }) {
  const [deleting, setDeleting] = useState(false)

  async function onDelete() {
    setDeleting(true)
    const result = await deleteUserTag(tag.id)
    if (!result.ok) toast.error(result.error)
    else toast.success(`已刪除「${tag.name}」`)
    setDeleting(false)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label={`刪除 ${tag.name}`}
          className="hover:text-destructive"
        >
          <Trash2 className="size-3" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>刪除自訂標籤「{tag.name}」？</AlertDialogTitle>
          <AlertDialogDescription>
            {tag.usage_count > 0
              ? `這個標籤正被 ${tag.usage_count} 筆沖煮使用，刪除後會自這些紀錄移除。`
              : '這個標籤尚未被任何沖煮使用。'}
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
  )
}

/** BREW-17：設定頁「我的標籤」區塊（FR-5.3/5.6）。 */
export function TagManager({
  tags,
  suggestions,
}: {
  tags: MyTag[]
  suggestions: Suggestion[]
}) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  async function onCreate() {
    const trimmed = name.trim()
    if (!trimmed || creating) return
    setCreating(true)
    const result = await createUserTag(trimmed)
    setCreating(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`已新增「${result.tag.name}」`)
    setName('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>我的標籤</CardTitle>
        <CardDescription>
          個人私有的風味標籤；也可在沖煮表單中直接建立
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {tags.length === 0 && (
            <p className="text-muted-foreground text-sm">還沒有自訂標籤。</p>
          )}
          {tags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="gap-1">
              {tag.name}
              <span className="text-muted-foreground text-xs">
                {tag.usage_count}
              </span>
              <DeleteTagButton tag={tag} />
            </Badge>
          ))}
        </div>

        <div className="flex max-w-xs gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="新標籤名稱"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onCreate()
              }
            }}
          />
          <Button
            variant="outline"
            onClick={onCreate}
            disabled={creating || !name.trim()}
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            新增
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">提交給內建標籤庫的建議</p>
            {suggestions.map((s) => (
              <p key={s.id} className="text-muted-foreground text-sm">
                {s.name} — {STATUS_LABELS[s.status] ?? s.status}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
