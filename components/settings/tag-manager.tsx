'use client'

import { useState } from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  createUserTag,
  deleteUserTag,
  renameUserTag,
} from '@/app/(app)/settings/actions'

type MyTag = { id: string; name: string; usage_count: number }
type Suggestion = {
  id: string
  name: string
  status: string
  group_name: string | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: '審核中',
  approved: '已加入群組標籤',
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
  // 改名（2026-07-17 回饋）：標籤以 id 關聯，改名後掛過的沖煮自動跟上
  const [editing, setEditing] = useState<MyTag | null>(null)
  const [editName, setEditName] = useState('')
  const [renaming, setRenaming] = useState(false)

  async function onRename() {
    if (!editing || renaming) return
    setRenaming(true)
    const result = await renameUserTag(editing.id, editName)
    setRenaming(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(
      `已改名為「${editName.trim()}」${
        editing.usage_count > 0
          ? `，掛過它的 ${editing.usage_count} 筆沖煮自動顯示新名稱`
          : ''
      }`,
    )
    setEditing(null)
  }

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
              <button
                type="button"
                aria-label={`改名 ${tag.name}`}
                onClick={() => {
                  setEditing(tag)
                  setEditName(tag.name)
                }}
                className="hover:text-foreground"
              >
                <Pencil className="size-3" />
              </button>
              <DeleteTagButton tag={tag} />
            </Badge>
          ))}
        </div>

        <Dialog
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>改名標籤「{editing?.name}」</DialogTitle>
              <DialogDescription>
                標籤以 ID 關聯，改名後
                {editing && editing.usage_count > 0
                  ? `掛過它的 ${editing.usage_count} 筆沖煮`
                  : '所有相關紀錄'}
                會自動顯示新名稱。
              </DialogDescription>
            </DialogHeader>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={30}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editName.trim() && !renaming) {
                  e.preventDefault()
                  onRename()
                }
              }}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditing(null)}
                disabled={renaming}
              >
                取消
              </Button>
              <Button
                onClick={onRename}
                disabled={
                  renaming ||
                  !editName.trim() ||
                  editName.trim() === editing?.name
                }
              >
                {renaming && <Loader2 className="size-4 animate-spin" />}
                改名
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
            <p className="text-sm font-medium">我提交的群組標籤建議</p>
            {suggestions.map((s) => (
              <p key={s.id} className="text-muted-foreground text-sm">
                {s.name}
                {s.group_name && ` →「${s.group_name}」`} —{' '}
                {STATUS_LABELS[s.status] ?? s.status}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
