'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { setBeanArchived } from '@/app/(app)/beans/actions'

/** FR-15.3 封存/解除封存（可逆操作，不需確認對話框）。 */
export function ArchiveBeanButton({
  beanId,
  beanName,
  archived,
}: {
  beanId: string
  beanName: string
  archived: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onToggle() {
    setBusy(true)
    const result = await setBeanArchived(beanId, !archived)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(
      archived
        ? `「${beanName}」已解除封存，重新出現在沖煮下拉`
        : `「${beanName}」已封存（歷史紀錄與分析保留）`,
    )
    router.refresh()
  }

  return (
    <Button variant="outline" size="sm" onClick={onToggle} disabled={busy}>
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : archived ? (
        <ArchiveRestore className="size-4" />
      ) : (
        <Archive className="size-4" />
      )}
      {archived ? '解除封存' : '封存'}
    </Button>
  )
}
