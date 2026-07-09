import type { Metadata } from 'next'

export const metadata: Metadata = { title: '登入' }

// P1：AUTH-6 實作登入表單
export default function LoginPage() {
  return (
    <div className="text-muted-foreground text-center text-sm">
      登入頁（W2 實作）
    </div>
  )
}
