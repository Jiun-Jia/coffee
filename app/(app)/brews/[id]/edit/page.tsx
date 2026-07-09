import type { Metadata } from 'next'

export const metadata: Metadata = { title: '編輯沖煮' }

// P5：BREW-10 實作編輯沖煮
export default async function EditBrewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">編輯沖煮</h1>
      <p className="text-muted-foreground text-sm">
        編輯沖煮 {id}（W4 實作）
      </p>
    </div>
  )
}
