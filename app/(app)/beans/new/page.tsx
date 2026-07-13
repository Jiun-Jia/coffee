import type { Metadata } from 'next'
import { BeanForm } from '@/components/beans/bean-form'
import { listMyGroups } from '@/lib/queries/groups'

export const metadata: Metadata = { title: '新增豆子' }

export default async function NewBeanPage() {
  const groups = await listMyGroups()

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">新增豆子</h1>
      <BeanForm groups={groups.map((g) => ({ id: g.id, name: g.name }))} />
    </div>
  )
}
