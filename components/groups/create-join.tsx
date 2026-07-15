'use client'

import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  applyToGroupByCode,
  createGroup,
  deleteJoinRequest,
} from '@/app/(app)/groups/actions'
import type { MyJoinRequest } from '@/lib/queries/groups'

/** 建立群組＋以邀請碼申請加入（FR-10.1 / FR-10.10）。 */
export function CreateJoinSection() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [applying, setApplying] = useState(false)

  async function onCreate() {
    const trimmed = name.trim()
    if (!trimmed || creating) return
    setCreating(true)
    const result = await createGroup(trimmed)
    setCreating(false)
    if (!result.ok) toast.error(result.error)
    else {
      setName('')
      toast.success(`已建立群組「${trimmed}」，把邀請碼分享給朋友吧`)
    }
  }

  async function onApply() {
    if (!code.trim() || applying) return
    setApplying(true)
    const result = await applyToGroupByCode(code)
    setApplying(false)
    if (!result.ok) toast.error(result.error)
    else {
      setCode('')
      toast.success(`已向「${result.groupName}」送出申請，等待建立者核可`)
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="新群組名稱"
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
          建立
        </Button>
      </div>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="輸入邀請碼申請加入"
          className="font-mono tracking-wider"
          maxLength={8}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onApply()
            }
          }}
        />
        <Button
          variant="outline"
          onClick={onApply}
          disabled={applying || code.trim().length !== 8}
        >
          {applying && <Loader2 className="size-4 animate-spin" />}
          申請加入
        </Button>
      </div>
    </div>
  )
}

/** 我送出的入群申請（等待核可，可撤回）。 */
export function MyRequests({ requests }: { requests: MyJoinRequest[] }) {
  const [busyId, setBusyId] = useState<string | null>(null)

  async function onCancel(request: MyJoinRequest) {
    setBusyId(request.id)
    const result = await deleteJoinRequest(request.id)
    setBusyId(null)
    if (!result.ok) toast.error(result.error)
    else toast.success(`已撤回「${request.group_name}」的申請`)
  }

  if (requests.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs font-medium">
        申請中（等待建立者核可）
      </p>
      <div className="flex flex-wrap gap-1">
        {requests.map((r) => (
          <Badge key={r.id} variant="outline" className="gap-1">
            {r.group_name}
            <span className="text-muted-foreground text-xs">
              {r.created_at.slice(0, 10)}
            </span>
            <button
              type="button"
              aria-label={`撤回 ${r.group_name} 的申請`}
              disabled={busyId === r.id}
              onClick={() => onCancel(r)}
              className="hover:text-destructive"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}
