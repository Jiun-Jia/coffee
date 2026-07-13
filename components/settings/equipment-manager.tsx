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
import { createEquipment, deleteEquipment } from '@/app/(app)/settings/actions'

type Kind = 'dripper' | 'filter' | 'kettle'
type Item = { id: string; name: string }

const KIND_META: { kind: Kind; label: string; placeholder: string }[] = [
  { kind: 'dripper', label: '濾杯', placeholder: '例：V60-01' },
  { kind: 'filter', label: '濾紙', placeholder: '例：Cafec 漂白' },
  { kind: 'kettle', label: '手沖壺', placeholder: '例：Fellow Stagg' },
]

function KindSection({ kind, label, placeholder, items }: {
  kind: Kind
  label: string
  placeholder: string
  items: Item[]
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function onAdd() {
    const trimmed = name.trim()
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

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.length === 0 && (
          <p className="text-muted-foreground text-sm">尚未新增。</p>
        )}
        {items.map((item) => (
          <Badge key={item.id} variant="secondary" className="gap-1">
            {item.name}
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
      </div>
      <div className="flex max-w-xs gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
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
          onClick={onAdd}
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
    </div>
  )
}

/** 設定頁「我的器材」：濾杯/濾紙/手沖壺清單，沖煮表單下拉選用。 */
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
          建立常用的濾杯 / 濾紙 / 手沖壺，沖煮時直接下拉選取（仍可臨時手打）
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
