import type { Metadata } from 'next'
import Link from 'next/link'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrewForm } from '@/components/brews/brew-form'
import { getCurrentProfile } from '@/lib/auth/profile'
import { brewRowToFormDefaults } from '@/lib/brew-form'
import { listBeans } from '@/lib/queries/beans'
import {
  getBrew,
  getBrewPours,
  getBrewTags,
  listBrews,
} from '@/lib/queries/brews'
import { listEquipment } from '@/lib/queries/equipment'
import { listGrinders } from '@/lib/queries/grinders'
import { listMyGroups } from '@/lib/queries/groups'
import { listFlavorTags } from '@/lib/queries/tags'

export const metadata: Metadata = { title: '新增沖煮' }

export default async function NewBrewPage({
  searchParams,
}: {
  searchParams: Promise<{ beanId?: string; copyFrom?: string }>
}) {
  const [{ beanId, copyFrom }, beans, grinders, tags, equipment, groups] =
    await Promise.all([
      searchParams,
      listBeans(),
      listGrinders(),
      listFlavorTags(),
      listEquipment(),
      listMyGroups(),
    ])

  // BREW-15：複製既有紀錄（帶入除日期時間外的全部欄位，日期改為當下）
  let copyDefaults = undefined
  if (copyFrom) {
    const source = await getBrew(copyFrom)
    if (source?.id) {
      const [sourceTags, sourcePours] = await Promise.all([
        getBrewTags(source.id),
        getBrewPours(source.id),
      ])
      copyDefaults = brewRowToFormDefaults(
        source,
        sourceTags.map((t) => t.id),
        sourcePours,
      )
    }
  }

  // 從豆子詳情「用這包沖煮」進來時預選（僅接受存在的豆子）
  const preselect = beans.some((b) => b.id === beanId) ? beanId : undefined

  // D13「複製上一杯」：已選豆子 → 該豆最近一筆；未選 → 最近一筆。
  // FR-10 後僅取「自己的」紀錄（複製朋友的參數請從其沖煮詳情頁操作）
  let copyLatestId: string | undefined
  if (!copyFrom) {
    const profile = await getCurrentProfile()
    const recent = (await listBrews()).filter(
      (b) => b.user_id === profile?.id,
    )
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
        // key：同路由換 searchParams（複製上一杯）時強制重掛，
        // 否則 useForm 的 defaultValues 只在首次 mount 生效、帶不進新值
        key={copyFrom ?? preselect ?? 'new'}
        beans={beans.map((b) => ({
          id: b.id,
          name_batch: b.name_batch,
          roaster: b.roaster,
          roast_date: b.roast_date,
          group_id: b.group_id,
        }))}
        grinders={grinders.map((g) => ({
          id: g.id,
          name: g.name,
          group_id: g.group_id,
        }))}
        tagOptions={tags.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
        }))}
        equipmentOptions={{
          dripper: equipment.dripper.map((e) => ({
            name: e.name,
            group_id: e.group_id,
          })),
          filter: equipment.filter.map((e) => ({
            name: e.name,
            group_id: e.group_id,
          })),
          kettle: equipment.kettle.map((e) => ({
            name: e.name,
            group_id: e.group_id,
          })),
        }}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        defaultValues={{
          ...copyDefaults,
          ...(preselect ? { bean_id: preselect } : {}),
        }}
      />
    </div>
  )
}
