import type { Metadata } from 'next'

export const metadata: Metadata = { title: '設定' }

// P10：AUTH-11（帳號）、BEAN-8（磨豆機）、BREW-17（我的標籤）、VIZ-12（匯出）
export default function SettingsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">設定</h1>
      <p className="text-muted-foreground text-sm">
        帳號 / 磨豆機 / 我的標籤 / 匯出（W2–W6 實作）
      </p>
    </div>
  )
}
