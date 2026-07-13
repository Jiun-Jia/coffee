'use client'

import { useState } from 'react'
import { Check, Copy, Loader2, LogOut, Plus, RefreshCw, Trash2, X } from 'lucide-react'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  createGroup,
  deleteGroup,
  joinGroupByCode,
  leaveGroup,
  regenerateInviteCode,
  removeGroupMember,
} from '@/app/(app)/settings/actions'
import type { MyGroup } from '@/lib/queries/groups'

function InviteCode({ group }: { group: MyGroup }) {
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function regenerate() {
    setRegenerating(true)
    const result = await regenerateInviteCode(group.id)
    setRegenerating(false)
    if (!result.ok) toast.error(result.error)
    else toast.success('已更換邀請碼，舊碼即刻失效')
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-muted-foreground">邀請碼：</span>
      <code className="bg-muted rounded px-1.5 py-0.5 font-mono tracking-wider">
        {group.invite_code}
      </code>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={copy}
        aria-label="複製邀請碼"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
      {group.isOwner && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={regenerate}
          disabled={regenerating}
          aria-label="更換邀請碼"
          title="更換邀請碼（舊碼失效）"
        >
          <RefreshCw className="size-3.5" />
        </Button>
      )}
    </div>
  )
}

function GroupCard({ group, myUserId }: { group: MyGroup; myUserId: string }) {
  async function onLeave() {
    const result = await leaveGroup(group.id)
    if (!result.ok) toast.error(result.error)
    else toast.success(`已退出「${group.name}」`)
  }

  async function onDelete() {
    const result = await deleteGroup(group.id)
    if (!result.ok) toast.error(result.error)
    else toast.success(`已解散「${group.name}」，群組豆已回歸各建立者`)
  }

  async function onRemove(userId: string, username: string) {
    const result = await removeGroupMember(group.id, userId)
    if (!result.ok) toast.error(result.error)
    else toast.success(`已將 ${username} 移出群組`)
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">
          {group.name}
          {group.isOwner && (
            <Badge variant="outline" className="ml-2">
              建立者
            </Badge>
          )}
        </p>
        {group.isOwner ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Trash2 className="size-4" />
                解散
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>解散「{group.name}」？</AlertDialogTitle>
                <AlertDialogDescription>
                  群組豆會回歸各自建立者的個人豆（沖煮紀錄保留、僅本人可見），
                  成員將看不到彼此的紀錄。此動作無法復原。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>解散</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button variant="ghost" size="sm" onClick={onLeave}>
            <LogOut className="size-4" />
            退出
          </Button>
        )}
      </div>
      <InviteCode group={group} />
      <div className="flex flex-wrap gap-1">
        {group.members.map((member) => (
          <Badge key={member.user_id} variant="secondary" className="gap-1">
            {member.username}
            {group.isOwner && member.user_id !== myUserId && (
              <button
                type="button"
                aria-label={`移除 ${member.username}`}
                onClick={() => onRemove(member.user_id, member.username)}
                className="hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
    </div>
  )
}

/** FR-10：設定頁群組管理（建立 / 邀請碼加入 / 成員 / 退出 / 解散）。 */
export function GroupManager({
  groups,
  myUserId,
}: {
  groups: MyGroup[]
  myUserId: string
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

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

  async function onJoin() {
    if (!code.trim() || joining) return
    setJoining(true)
    const result = await joinGroupByCode(code)
    setJoining(false)
    if (!result.ok) toast.error(result.error)
    else {
      setCode('')
      toast.success(`已加入「${result.groupName}」`)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>群組</CardTitle>
        <CardDescription>
          和朋友共有同一包豆：群組豆全員可見、各自記錄沖煮並互相比較（可看不可改）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} myUserId={myUserId} />
        ))}

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
              placeholder="輸入邀請碼加入"
              className="font-mono tracking-wider"
              maxLength={8}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onJoin()
                }
              }}
            />
            <Button
              variant="outline"
              onClick={onJoin}
              disabled={joining || code.trim().length !== 8}
            >
              {joining && <Loader2 className="size-4 animate-spin" />}
              加入
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
