import type { Metadata } from 'next'

export const metadata: Metadata = { title: '分析' }

// P9：VIZ-9 實作分析頁（A2/A3/A4/A5 四象限）
export default function AnalyticsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">分析</h1>
      <p className="text-muted-foreground text-sm">分析頁（W5 實作）</p>
    </div>
  )
}
