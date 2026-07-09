import type { Metadata } from 'next'
import Link from 'next/link'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrewForm } from '@/components/brews/brew-form'
import { brewRowToFormDefaults } from '@/lib/brew-form'
import { listBeans } from '@/lib/queries/beans'
import { getBrew, getBrewTags, listBrews } from '@/lib/queries/brews'
import { listGrinders } from '@/lib/queries/grinders'
import { listFlavorTags } from '@/lib/queries/tags'

export const metadata: Metadata = { title: '新增沖煮' }

export default async function NewBrewPage({
  searchParams,
}: {
  searchParams: Promise<{ beanId?: string; copyFrom?: string }>
}) {
  const [{ beanId, copyFrom }, beans, grinders, tags] = await Promise.all([
    searchParams,
    listBeans(),
    listGrinders(),
    listFlavorTags(),
  ])

  // BREW-15：複製既有紀錄（帶入除日期時間外的全部欄位，日期改為當下）
  let copyDefaults = undefined
  if (copyFrom) {
    const source = await getBrew(copyFrom)
    if (source?.id) {
      copyDefaults = brewRowToFormDefaults(
        source,
        (await getBrewTags(source.id)).map((t) => t.id),
      )
    }
  }

  // 從豆子詳情「用這包沖煮」進來時預選（僅接受存在的豆子）
  const preselect = beans.some((b) => b.id === beanId) ? beanId : undefined

  // D13「複製上一杯」：已選豆子 → 該豆最近一筆；未選 → 全域最近一筆
  let copyLatestId: string | undefined
  if (!copyFrom) {
    const recent = await listBrews()
    const source = preselect
      ? recent.find((b) => b.bean_id === preselect)
      : recent[0]
    copyLatestId = source?.id ?? undefined
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {copyDefaults ? '複製沖煮' : '新增沖煮'}
        </h1>
        {copyLatestId && (
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/brews/new?copyFrom=${copyLatestId}${preselect ? `&beanId=${preselect}` : ''}`}
            >
              <Copy className="size-4" />
              複製上一杯
            </Link>
          </Button>
        )}
      </div>
      <BrewForm
        beans={beans.map((b) => ({
          id: b.id,
          name_batch: b.name_batch,
          roaster: b.roaster,
          roast_date: b.roast_date,
        }))}
        grinders={grinders.map((g) => ({ id: g.id, name: g.name }))}
        tagOptions={tags.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
        }))}
        defaultValues={{
          ...copyDefaults,
          ...(preselect ? { bean_id: preselect } : {}),
        }}
      />
    </div>
  )
}
