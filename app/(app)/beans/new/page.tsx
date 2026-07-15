import type { Metadata } from 'next'
import { BeanForm } from '@/components/beans/bean-form'
import { listMyGroups } from '@/lib/queries/groups'

export const metadata: Metadata = { title: '新增豆子' }

export default async function NewBeanPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string }>
}) {
  const [{ groupId }, groups] = await Promise.all([
    searchParams,
    listMyGroups(),
  ])

  // 從群組頁「新增豆子」進來時預選歸屬（僅接受自己所屬的群組）
  const preselect = groups.some((g) => g.id === groupId) ? groupId : undefined

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">新增豆子</h1>
      <BeanForm
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        defaultValues={preselect ? { group_id: preselect } : undefined}
      />
    </div>
  )
}
