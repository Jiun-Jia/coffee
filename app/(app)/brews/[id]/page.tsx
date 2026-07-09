import type { Metadata } from 'next'

export const metadata: Metadata = { title: '沖煮詳情' }

// P4：BREW-14 實作沖煮詳情
export default async function BrewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">沖煮詳情</h1>
      <p className="text-muted-foreground text-sm">
        沖煮 {id}（W4 實作）
      </p>
    </div>
  )
}
