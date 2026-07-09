import type { Metadata } from 'next'

export const metadata: Metadata = { title: '新增豆子' }

// P8：BEAN-3 實作豆子表單
export default function NewBeanPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">新增豆子</h1>
      <p className="text-muted-foreground text-sm">豆子表單（W3 實作）</p>
    </div>
  )
}
