import type { Metadata } from 'next'

export const metadata: Metadata = { title: '豆子詳情' }

// P7：BEAN-5 實作豆子詳情（含 A1 比較插槽）
export default async function BeanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">豆子詳情</h1>
      <p className="text-muted-foreground text-sm">
        豆子 {id}（W4 實作）
      </p>
    </div>
  )
}
