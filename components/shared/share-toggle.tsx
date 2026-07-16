'use client'

import { useState } from 'react'
import { Check, Copy, Globe, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { setBeanShared } from '@/app/(app)/beans/actions'
import { setBrewShared } from '@/app/(app)/brews/actions'

/**
 * FR-9 公開分享開關（SHARE-1）：開＝產生不可猜連結、關＝立即作廢。
 * 公開頁為欄位白名單的唯讀配方卡（備註/下次調整不公開）。
 */
export function ShareToggle({
  kind,
  id,
  slug,
}: {
  kind: 'bean' | 'brew'
  id: string
  /** 目前的 public_slug（null＝未公開） */
  slug: string | null
}) {
  const [currentSlug, setCurrentSlug] = useState(slug)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const setShared = kind === 'bean' ? setBeanShared : setBrewShared
  const url =
    currentSlug && typeof window !== 'undefined'
      ? `${window.location.origin}/share/${currentSlug}`
      : null

  async function onToggle(next: boolean) {
    setBusy(true)
    const result = await setShared(id, next)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setCurrentSlug(result.slug)
    setCopied(false)
    toast.success(
      next
        ? '已開啟公開分享，連結可傳給任何人（唯讀）'
        : '已關閉分享，舊連結立即失效',
    )
  }

  async function onCopy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('連結已複製')
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Globe className="size-4" />
          公開分享
          {busy && <Loader2 className="size-3.5 animate-spin" />}
        </span>
        <Switch
          checked={currentSlug !== null}
          onCheckedChange={onToggle}
          disabled={busy}
          aria-label="公開分享"
        />
      </div>
      {url ? (
        <div className="flex gap-2">
          <Input readOnly value={url} className="h-8 text-xs" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={onCopy}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            複製
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          開啟後產生唯讀連結（不含自由備註與下次調整）；關閉即失效。
        </p>
      )}
    </div>
  )
}
