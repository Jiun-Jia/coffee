import type { Metadata } from 'next'

export const metadata: Metadata = { title: '編輯豆子' }

// P8：BEAN-3 實作編輯豆子
export default async function EditBeanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">編輯豆子</h1>
      <p className="text-muted-foreground text-sm">
        編輯豆子 {id}（W4 實作）
      </p>
    </div>
  )
}
