import type { Metadata } from 'next'
import { BrewForm } from '@/components/brews/brew-form'
import { listBeans } from '@/lib/queries/beans'
import { listGrinders } from '@/lib/queries/grinders'

export const metadata: Metadata = { title: '新增沖煮' }

export default async function NewBrewPage({
  searchParams,
}: {
  searchParams: Promise<{ beanId?: string }>
}) {
  const [{ beanId }, beans, grinders] = await Promise.all([
    searchParams,
    listBeans(),
    listGrinders(),
  ])

  // 從豆子詳情「用這包沖煮」進來時預選（僅接受存在的豆子）
  const preselect = beans.some((b) => b.id === beanId) ? beanId : undefined

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">新增沖煮</h1>
      <BrewForm
        beans={beans.map((b) => ({
          id: b.id,
          name_batch: b.name_batch,
          roaster: b.roaster,
          roast_date: b.roast_date,
        }))}
        grinders={grinders.map((g) => ({ id: g.id, name: g.name }))}
        defaultValues={preselect ? { bean_id: preselect } : undefined}
      />
    </div>
  )
}
