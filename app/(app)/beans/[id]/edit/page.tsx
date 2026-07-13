import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BeanForm } from '@/components/beans/bean-form'
import { getBean } from '@/lib/queries/beans'
import { getCurrentProfile } from '@/lib/auth/profile'
import { listMyGroups } from '@/lib/queries/groups'

export const metadata: Metadata = { title: '編輯豆子' }

export default async function EditBeanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [bean, profile, groups] = await Promise.all([
    getBean(id), // RLS：非可見者拿到 null
    getCurrentProfile(),
    listMyGroups(),
  ])
  if (!bean) notFound()
  // FR-10.3：群組豆僅建立者可編輯（RLS 也擋，這裡先給 404 避免空表單誤導）
  if (bean.user_id !== profile?.id) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">編輯豆子</h1>
      <BeanForm
        beanId={bean.id}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        defaultValues={{
          roaster: bean.roaster,
          name_batch: bean.name_batch,
          origin: bean.origin,
          group_id: bean.group_id ?? '',
          varietal: bean.varietal ?? '',
          process: bean.process ?? '',
          altitude: bean.altitude ?? '',
          farm: bean.farm ?? '',
          roast_level: bean.roast_level,
          roast_date: bean.roast_date,
          notes: bean.notes ?? '',
        }}
      />
    </div>
  )
}
