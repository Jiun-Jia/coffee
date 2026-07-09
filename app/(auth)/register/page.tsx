import type { Metadata } from 'next'

export const metadata: Metadata = { title: '註冊' }

// P1：AUTH-4 實作註冊表單
export default function RegisterPage() {
  return (
    <div className="text-muted-foreground text-center text-sm">
      註冊頁（W2 實作）
    </div>
  )
}
