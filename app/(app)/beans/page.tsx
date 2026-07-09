import type { Metadata } from 'next'

export const metadata: Metadata = { title: '豆子' }

// P6：BEAN-4 實作豆子列表
export default function BeansPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">豆子</h1>
      <p className="text-muted-foreground text-sm">豆子列表（W3 實作）</p>
    </div>
  )
}
