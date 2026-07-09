import type { Metadata } from 'next'

export const metadata: Metadata = { title: '首頁' }

// P2：VIZ-11 實作 Dashboard（統計卡 + 最近沖煮 + 快速新增）
export default function DashboardPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">首頁</h1>
      <p className="text-muted-foreground text-sm">Dashboard（W6 實作）</p>
    </div>
  )
}
