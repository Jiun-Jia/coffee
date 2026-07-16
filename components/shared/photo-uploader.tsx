'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { compressImage } from '@/lib/image'
import { createClient } from '@/lib/supabase/client'
import { setBeanPhoto } from '@/app/(app)/beans/actions'
import { setBrewPhoto } from '@/app/(app)/brews/actions'

/**
 * FR-22 照片上傳（PHOTO-2）：前端壓縮（1600px/WebP/≤500KB）→
 * 直傳 Storage（RLS 限本人資料夾）→ server action 回寫 photo_path。
 * 顯示用簽名 URL 由 server 端頁面傳入（private bucket）。
 */
export function PhotoUploader({
  kind,
  id,
  userId,
  photoUrl,
  photoPath,
  canEdit,
  label,
}: {
  kind: 'bean' | 'brew'
  id: string
  userId: string
  /** server 端產生的簽名 URL（null＝尚無照片） */
  photoUrl: string | null
  photoPath: string | null
  canEdit: boolean
  label: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const setPhoto = kind === 'bean' ? setBeanPhoto : setBrewPhoto

  async function onSelect(file: File) {
    setBusy(true)
    try {
      const blob = await compressImage(file)
      const path = `${userId}/${kind}/${id}.webp`
      const supabase = createClient()
      const { error } = await supabase.storage
        .from('photos')
        .upload(path, blob, {
          upsert: true,
          contentType: 'image/webp',
          cacheControl: '3600',
        })
      if (error) throw new Error(error.message)

      const result = await setPhoto(id, path)
      if (!result.ok) throw new Error(result.error)
      toast.success(`${label}已更新`)
      router.refresh()
    } catch (e) {
      toast.error(`上傳失敗：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function onDelete() {
    if (!photoPath) return
    setBusy(true)
    try {
      const result = await setPhoto(id, null)
      if (!result.ok) throw new Error(result.error)
      await createClient().storage.from('photos').remove([photoPath])
      toast.success(`${label}已刪除`)
      router.refresh()
    } catch (e) {
      toast.error(`刪除失敗：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  if (!photoUrl && !canEdit) return null

  return (
    <div className="space-y-2">
      {photoUrl && (
        <Image
          src={photoUrl}
          alt={label}
          width={640}
          height={480}
          unoptimized
          className="max-h-72 w-auto rounded-md border object-contain"
        />
      )}
      {canEdit && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onSelect(file)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : photoUrl ? (
              <RefreshCw className="size-4" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            {photoUrl ? `替換${label}` : `上傳${label}`}
          </Button>
          {photoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
              刪除
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
