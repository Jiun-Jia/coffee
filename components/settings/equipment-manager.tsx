'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
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
  createEquipment,
  deleteEquipment,
  renameEquipment,
} from '@/app/(app)/settings/actions'
import { DRIPPER_PRESETS, FILTER_PRESETS, KETTLE_PRESETS } from '@/lib/presets'

type Kind = 'dripper' | 'filter' | 'kettle'
type Item = { id: string; name: string }

const QUICK_ADD_COLLAPSED = 5

const KIND_META: {
  kind: Kind
  label: string
  placeholder: string
  presets: readonly string[]
}[] = [
  {
    kind: 'dripper',
    label: '濾杯',
    placeholder: '例：V60-01',
    presets: DRIPPER_PRESETS,
  },
  {
    kind: 'filter',
    label: '濾紙',
    placeholder: '例：Cafec 漂白',
    presets: FILTER_PRESETS,
  },
  {
    kind: 'kettle',
    label: '手沖壺',
    placeholder: '例：Fellow Stagg',
    presets: KETTLE_PRESETS,
  },
]

function KindSection({
  kind,
  label,
  placeholder,
  presets,
  items,
}: {
  kind: Kind
  label: string
  placeholder: string
  presets: readonly string[]
  items: Item[]
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  // 改名 dialog（2026-07-17 回饋：改名會同步既有沖煮/配方的舊文字）
  const [editing, setEditing] = useState<Item | null>(null)
  const [editName, setEditName] = useState('')

  async function onRename() {
    if (!editing || busy) return
    setBusy(true)
    const result = await renameEquipment(editing.id, editName)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    const synced = [
      result.updatedBrews > 0 && `${result.updatedBrews} 筆沖煮`,
      result.updatedRecipes > 0 && `${result.updatedRecipes} 個配方`,
    ].filter(Boolean)
    toast.success(
      `已改名為「${editName.trim()}」${
        synced.length > 0 ? `，並同步 ${synced.join('、')}` : ''
      }`,
    )
    setEditing(null)
  }

  async function onAdd(value?: string) {
    const trimmed = (value ?? name).trim()
    if (!trimmed || busy) return
    setBusy(true)
    const result = await createEquipment(kind, trimmed)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setName('')
    toast.success(`已新增${label}「${trimmed}」`)
  }

  async function onDelete(item: Item) {
    const result = await deleteEquipment(item.id)
    if (!result.ok) toast.error(result.error)
    else toast.success(`已刪除「${item.name}」`)
  }

  // 快速加入建議：排除已在清單中的；預設列 5 個，「更多」展開其餘
  const existing = new Set(items.map((i) => i.name))
  const candidates = presets.filter((p) => !existing.has(p))
  const quickAdd = expanded
    ? candidates
    : candidates.slice(0, QUICK_ADD_COLLAPSED)
  const hiddenCount = candidates.length - QUICK_ADD_COLLAPSED

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.length === 0 && (
          <p className="text-muted-foreground text-sm">
            尚未新增，可從下方建議快速加入。
          </p>
        )}
        {items.map((item) => (
          <Badge key={item.id} variant="secondary" className="gap-1">
            {item.name}
            <button
              type="button"
              aria-label={`改名 ${item.name}`}
              onClick={() => {
                setEditing(item)
                setEditName(item.name)
              }}
              className="hover:text-foreground"
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              aria-label={`刪除 ${item.name}`}
              onClick={() => onDelete(item)}
              className="hover:text-destructive"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <Dialog
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>
                改名{label}「{editing?.name}」
              </DialogTitle>
              <DialogDescription>
                會一併把你既有沖煮與配方裡的「{editing?.name}
                」更新成新名稱（群組成員的紀錄不受影響）。
              </DialogDescription>
            </DialogHeader>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={100}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editName.trim() && !busy) {
                  e.preventDefault()
                  onRename()
                }
              }}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                取消
              </Button>
              <Button
                onClick={onRename}
                disabled={
                  busy || !editName.trim() || editName.trim() === editing?.name
                }
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                改名並同步
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex max-w-md gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="min-w-32 flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAdd()
            }
          }}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => onAdd()}
          disabled={busy || !name.trim()}
          aria-label={`新增${label}`}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
        </Button>
      </div>
      {quickAdd.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-muted-foreground text-xs">快速加入：</span>
          {quickAdd.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={busy}
              onClick={() => onAdd(preset)}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-full border border-dashed px-2 py-0.5 text-xs"
            >
              ＋ {preset}
            </button>
          ))}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 px-1 text-xs underline-offset-2 hover:underline"
            >
              {expanded ? (
                <>
                  收合
                  <ChevronUp className="size-3" />
                </>
              ) : (
                <>
                  更多（{hiddenCount}）
                  <ChevronDown className="size-3" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** 設定頁「我的器材」。僅個人器材；群組共用的在群組卡片管理（FR-10.9b）。 */
export function EquipmentManager({
  equipment,
}: {
  equipment: Record<Kind, Item[]>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>我的器材</CardTitle>
        <CardDescription>
          建立常用的濾杯 / 濾紙 /
          手沖壺，沖煮時直接下拉選取；群組共用器材請到「群組」頁新增
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {KIND_META.map((meta) => (
          <KindSection key={meta.kind} {...meta} items={equipment[meta.kind]} />
        ))}
      </CardContent>
    </Card>
  )
}
