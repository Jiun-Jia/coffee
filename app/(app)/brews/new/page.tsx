import type { Metadata } from 'next'

export const metadata: Metadata = { title: '新增沖煮' }

// P5：BREW-2 實作沖煮表單
export default function NewBrewPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">新增沖煮</h1>
      <p className="text-muted-foreground text-sm">沖煮表單（W3 實作）</p>
    </div>
  )
}
