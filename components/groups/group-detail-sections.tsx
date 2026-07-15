'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ComboboxInput } from '@/components/forms/combobox-input'
import {
  approveGroupGear,
  approveJoinRequest,
  approveTagSuggestion,
  deleteGroup,
  deleteGroupTag,
  deleteJoinRequest,
  leaveGroup,
  regenerateInviteCode,
  rejectTagSuggestion,
  removeGroupMember,
} from '@/app/(app)/groups/actions'
import {
  createEquipment,
  createGrinder,
  deleteEquipment,
  deleteGrinder,
} from '@/app/(app)/settings/actions'
import {
  DRIPPER_PRESETS,
  FILTER_PRESETS,
  GRINDER_PRESETS,
  KETTLE_PRESETS,
} from '@/lib/presets'
import type {
  GroupGearItem,
  GroupGearKind,
  GroupJoinRequest,
  MyGroup,
} from '@/lib/queries/groups'
import type { GroupTag, PendingSuggestion } from '@/lib/queries/tags'

// ============ 邀請碼 ============

export function InviteCode({ group }: { group: MyGroup }) {
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

// ============ 退出 / 解散 ============

export function HeaderActions({ group }: { group: MyGroup }) {
  const router = useRouter()

  async function onLeave() {
    const result = await leaveGroup(group.id)
    if (!result.ok) toast.error(result.error)
    else {
      toast.success(`已退出「${group.name}」`)
      router.push('/groups')
    }
  }

  async function onDelete() {
    const result = await deleteGroup(group.id)
    if (!result.ok) toast.error(result.error)
    else {
      toast.success(`已解散「${group.name}」，群組豆已回歸各建立者`)
      router.push('/groups')
    }
  }

  if (group.isOwner) {
    return (
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
    )
  }

  return (
    <Button variant="ghost" size="sm" onClick={onLeave}>
      <LogOut className="size-4" />
      退出
    </Button>
  )
}

// ============ 成員（含入群審核，FR-10.10） ============

function JoinRequestRow({ request }: { request: GroupJoinRequest }) {
  const [busy, setBusy] = useState(false)

  async function act(action: 'approve' | 'reject') {
    setBusy(true)
    const result =
      action === 'approve'
        ? await approveJoinRequest(request.id)
        : await deleteJoinRequest(request.id)
    setBusy(false)
    if (!result.ok) toast.error(result.error)
    else
      toast.success(
        action === 'approve'
          ? `${request.username} 已加入群組`
          : `已退回 ${request.username} 的申請`,
      )
  }

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span>
        <Badge variant="secondary">{request.username}</Badge>
        <span className="text-muted-foreground ml-2 text-xs">
          申請於 {request.created_at.slice(0, 10)}
        </span>
      </span>
      <span className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => act('approve')}
        >
          <Check className="size-3.5" />
          核可
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => act('reject')}
        >
          <X className="size-3.5" />
          退回
        </Button>
      </span>
    </div>
  )
}

export function MemberSection({
  group,
  myUserId,
  joinRequests,
}: {
  group: MyGroup
  myUserId: string
  joinRequests: GroupJoinRequest[]
}) {
  async function onRemove(userId: string, username: string) {
    const result = await removeGroupMember(group.id, userId)
    if (!result.ok) toast.error(result.error)
    else toast.success(`已將 ${username} 移出群組`)
  }

  return (
    <div className="space-y-2">
      {group.isOwner && joinRequests.length > 0 && (
        <div className="space-y-1.5 rounded-md border border-dashed p-2">
          <p className="text-muted-foreground text-xs font-medium">
            待審核的入群申請
          </p>
          {joinRequests.map((r) => (
            <JoinRequestRow key={r.id} request={r} />
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {group.members.map((member) => (
          <Badge key={member.user_id} variant="secondary" className="gap-1">
            {member.username}
            {member.user_id === group.owner_id && (
              <span className="text-muted-foreground text-xs">建立者</span>
            )}
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

// ============ 群組標籤（FR-5.6） ============

function GroupTagChip({ tag, canDelete }: { tag: GroupTag; canDelete: boolean }) {
  const [busy, setBusy] = useState(false)

  async function onDelete() {
    setBusy(true)
    const result = await deleteGroupTag(tag.id)
    setBusy(false)
    if (!result.ok) toast.error(result.error)
    else toast.success(`已刪除群組標籤「${tag.name}」`)
  }

  if (!canDelete) return <Badge variant="secondary">{tag.name}</Badge>

  return (
    <AlertDialog>
      <Badge variant="secondary" className="gap-1">
        {tag.name}
        <AlertDialogTrigger asChild>
          <button
            type="button"
            aria-label={`刪除群組標籤 ${tag.name}`}
            disabled={busy}
            className="hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        </AlertDialogTrigger>
      </Badge>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>刪除群組標籤「{tag.name}」？</AlertDialogTitle>
          <AlertDialogDescription>
            所有成員將無法再選用，已掛上此標籤的沖煮也會移除它。無法復原。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete}>刪除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function SuggestionReview({ suggestion }: { suggestion: PendingSuggestion }) {
  const [busy, setBusy] = useState(false)

  async function act(action: 'approve' | 'reject') {
    setBusy(true)
    const result =
      action === 'approve'
        ? await approveTagSuggestion(suggestion.id)
        : await rejectTagSuggestion(suggestion.id)
    setBusy(false)
    if (!result.ok) toast.error(result.error)
    else
      toast.success(
        action === 'approve'
          ? `「${suggestion.name}」已加入群組標籤`
          : `已退回「${suggestion.name}」`,
      )
  }

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span>
        <Badge variant="secondary">{suggestion.name}</Badge>
        <span className="text-muted-foreground ml-2 text-xs">
          由 {suggestion.submitter} 提交
        </span>
      </span>
      <span className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => act('approve')}
        >
          <Check className="size-3.5" />
          核可
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => act('reject')}
        >
          <X className="size-3.5" />
          退回
        </Button>
      </span>
    </div>
  )
}

export function TagSection({
  group,
  tags,
  pending,
}: {
  group: MyGroup
  tags: GroupTag[]
  pending: PendingSuggestion[]
}) {
  return (
    <div className="space-y-2">
      {group.isOwner && pending.length > 0 && (
        <div className="space-y-1.5 rounded-md border border-dashed p-2">
          <p className="text-muted-foreground text-xs font-medium">
            待審核的標籤提交
          </p>
          {pending.map((s) => (
            <SuggestionReview key={s.id} suggestion={s} />
          ))}
        </div>
      )}
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <GroupTagChip key={tag.id} tag={tag} canDelete={group.isOwner} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          還沒有群組標籤。成員可在沖煮表單建立標籤時「同步提交群組」，
          {group.isOwner ? '由你' : '由建立者'}核可後全員可選用。
        </p>
      )}
    </div>
  )
}

// ============ 共用器材（FR-10.9b） ============

const GEAR_KINDS: { kind: GroupGearKind; label: string }[] = [
  { kind: 'grinder', label: '磨豆機' },
  { kind: 'dripper', label: '濾杯' },
  { kind: 'filter', label: '濾紙' },
  { kind: 'kettle', label: '手沖壺' },
]
const GEAR_PRESETS: Record<GroupGearKind, readonly string[]> = {
  grinder: GRINDER_PRESETS.map((p) => p.name),
  dripper: DRIPPER_PRESETS,
  filter: FILTER_PRESETS,
  kettle: KETTLE_PRESETS,
}

function deleteGear(item: GroupGearItem) {
  return item.gearKind === 'grinder'
    ? deleteGrinder(item.id)
    : deleteEquipment(item.id)
}

/** 群組器材 chip：待審核（建立者可核可/退回、提案人可撤回）或已生效（建立者可刪）。 */
function GearChip({
  item,
  isOwner,
  myUserId,
}: {
  item: GroupGearItem
  isOwner: boolean
  myUserId: string
}) {
  const [busy, setBusy] = useState(false)
  const pending = item.status === 'pending'

  async function onApprove() {
    setBusy(true)
    const result = await approveGroupGear(item.gearKind, item.id)
    setBusy(false)
    if (!result.ok) toast.error(result.error)
    else toast.success(`「${item.name}」已生效，全體成員可在沖煮選用`)
  }

  async function onRemove(kindOfAction: '退回' | '撤回' | '刪除') {
    setBusy(true)
    const result = await deleteGear(item)
    setBusy(false)
    if (!result.ok) toast.error(result.error)
    else toast.success(`已${kindOfAction}「${item.name}」`)
  }

  if (pending) {
    return (
      <Badge variant="outline" className="gap-1">
        {item.name}
        <span className="text-muted-foreground text-xs">
          待審核・{item.submitter}
        </span>
        {isOwner && (
          <button
            type="button"
            aria-label={`核可 ${item.name}`}
            title="核可"
            disabled={busy}
            onClick={onApprove}
            className="hover:text-foreground"
          >
            <Check className="size-3" />
          </button>
        )}
        {(isOwner || item.user_id === myUserId) && (
          <button
            type="button"
            aria-label={`${isOwner ? '退回' : '撤回'} ${item.name}`}
            title={isOwner ? '退回' : '撤回'}
            disabled={busy}
            onClick={() => onRemove(isOwner ? '退回' : '撤回')}
            className="hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        )}
      </Badge>
    )
  }

  if (!isOwner) return <Badge variant="secondary">{item.name}</Badge>

  return (
    <AlertDialog>
      <Badge variant="secondary" className="gap-1">
        {item.name}
        <AlertDialogTrigger asChild>
          <button
            type="button"
            aria-label={`刪除 ${item.name}`}
            disabled={busy}
            className="hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        </AlertDialogTrigger>
      </Badge>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>刪除共用器材「{item.name}」？</AlertDialogTitle>
          <AlertDialogDescription>
            成員將無法再於沖煮下拉選用。
            {item.gearKind === 'grinder' &&
              '已綁定它的沖煮紀錄會失去磨豆機綁定（刻度文字保留）。'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={() => onRemove('刪除')}>
            刪除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** 共用器材區：清單＋新增（成員新增為提案，建立者新增直接生效）。 */
export function GearSection({
  group,
  gear,
  myUserId,
}: {
  group: MyGroup
  gear: GroupGearItem[]
  myUserId: string
}) {
  const [kind, setKind] = useState<GroupGearKind>('dripper')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function onAdd() {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    // 磨豆機選中預設機種 → 自動帶入刀盤類型與備註（FR-12）
    const preset = GRINDER_PRESETS.find((p) => p.name === trimmed)
    const result =
      kind === 'grinder'
        ? await createGrinder(
            {
              name: trimmed,
              burr_type: preset?.burr_type ?? '',
              notes: preset?.notes ?? '',
            },
            group.id,
          )
        : await createEquipment(kind, trimmed, group.id)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setName('')
    toast.success(
      result.pending
        ? `已提交「${trimmed}」，待建立者核可後全員可選用`
        : `已新增共用器材「${trimmed}」`,
    )
  }

  return (
    <div className="space-y-1.5">
      {gear.length === 0 && (
        <p className="text-muted-foreground text-sm">
          還沒有共用器材。新增後全員沖煮群組豆時可直接選用
          {!group.isOwner && '（你新增的會先送建立者核可）'}。
        </p>
      )}
      {GEAR_KINDS.map(({ kind: k, label }) => {
        const items = gear.filter((g) => g.gearKind === k)
        if (items.length === 0) return null
        return (
          <div key={k} className="flex flex-wrap items-center gap-1">
            <span className="text-muted-foreground text-xs">{label}：</span>
            {items.map((item) => (
              <GearChip
                key={item.id}
                item={item}
                isOwner={group.isOwner}
                myUserId={myUserId}
              />
            ))}
          </div>
        )
      })}
      <div className="flex max-w-md gap-2 pt-1">
        <Select value={kind} onValueChange={(v) => setKind(v as GroupGearKind)}>
          <SelectTrigger size="sm" className="w-27 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GEAR_KINDS.map(({ kind: k, label }) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="min-w-32 flex-1">
          <ComboboxInput
            value={name}
            onChange={setName}
            options={[...GEAR_PRESETS[kind]]}
            placeholder="選擇常見型號或自行輸入"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onAdd}
          disabled={busy || !name.trim()}
          aria-label="新增共用器材"
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
