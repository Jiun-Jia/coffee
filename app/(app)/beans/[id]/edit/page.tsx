import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BeanForm } from '@/components/beans/bean-form'
import { getBean } from '@/lib/queries/beans'

export const metadata: Metadata = { title: '編輯豆子' }

export default async function EditBeanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const bean = await getBean(id) // RLS：非本人拿到 null
  if (!bean) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">編輯豆子</h1>
      <BeanForm
        beanId={bean.id}
        defaultValues={{
          roaster: bean.roaster,
          name_batch: bean.name_batch,
          origin: bean.origin,
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
