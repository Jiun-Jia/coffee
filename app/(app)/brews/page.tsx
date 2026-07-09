import type { Metadata } from 'next'

export const metadata: Metadata = { title: '沖煮紀錄' }

// P3：BREW-12/13 實作列表與篩選
export default function BrewsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">沖煮紀錄</h1>
      <p className="text-muted-foreground text-sm">沖煮列表（W3 實作）</p>
    </div>
  )
}
