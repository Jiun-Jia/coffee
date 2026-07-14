'use client'

import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createEquipment, deleteEquipment } from '@/app/(app)/settings/actions'
import {
  DRIPPER_PRESETS,
  FILTER_PRESETS,
  KETTLE_PRESETS,
} from '@/lib/presets'

type Kind = 'dripper' | 'filter' | 'kettle'
type Item = {
  id: string
  name: string
  user_id: string
  group_name: string | null
}
type GroupOption = { id: string; name: string }

const KIND_META: {
  kind: Kind
  label: string
  placeholder: string
  presets: readonly string[]
}[] = [
  { kind: 'dripper', label: '濾杯', placeholder: '例：V60-01', presets: DRIPPER_PRESETS },
  { kind: 'filter', label: '濾紙', placeholder: '例：Cafec 漂白', presets: FILTER_PRESETS },
  { kind: 'kettle', label: '手沖壺', placeholder: '例：Fellow Stagg', presets: KETTLE_PRESETS },
]

function KindSection({
  kind,
  label,
  placeholder,
  presets,
  items,
  groups,
  myUserId,
}: {
  kind: Kind
  label: string
  placeholder: string
  presets: readonly string[]
  items: Item[]
  groups: GroupOption[]
  myUserId: string
}) {
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState('') // ''＝個人
  const [busy, setBusy] = useState(false)

  async function onAdd(value?: string) {
    const trimmed = (value ?? name).trim()
    if (!trimmed || busy) return
    setBusy(true)
    const result = await createEquipment(kind, trimmed, groupId || undefined)
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

  // 快速加入建議：排除已在清單中的
  const existing = new Set(items.map((i) => i.name))
  const quickAdd = presets.filter((p) => !existing.has(p)).slice(0, 5)

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
            {item.group_name && (
              <span className="text-muted-foreground text-xs">
                {item.group_name}
              </span>
            )}
            {item.user_id === myUserId && (
              <button
                type="button"
                aria-label={`刪除 ${item.name}`}
                onClick={() => onDelete(item)}
                className="hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      <div className="flex max-w-md flex-wrap gap-2">
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
        {groups.length > 0 && (
          <Select
            value={groupId === '' ? '__personal' : groupId}
            onValueChange={(v) => setGroupId(v === '__personal' ? '' : v)}
          >
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__personal">個人</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
        </div>
      )}
    </div>
  )
}

/** 設定頁「我的器材」（＋FR-10.9 群組共用、預設建議快速加入）。 */
export function EquipmentManager({
  equipment,
  groups,
  myUserId,
}: {
  equipment: Record<Kind, Item[]>
  groups: GroupOption[]
  myUserId: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>我的器材</CardTitle>
        <CardDescription>
          建立常用的濾杯 / 濾紙 / 手沖壺，沖煮時直接下拉選取；群組器材全體成員可選用
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {KIND_META.map((meta) => (
          <KindSection
            key={meta.kind}
            {...meta}
            items={equipment[meta.kind]}
            groups={groups}
            myUserId={myUserId}
          />
        ))}
      </CardContent>
    </Card>
  )
}
