import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: '登入' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>
}) {
  const { redirectTo, error } = await searchParams

  return (
    <div className="space-y-4">
      {error === 'link_expired' && (
        <p className="text-destructive text-center text-sm">
          連結已失效或不正確，請重新操作。
        </p>
      )}
      <LoginForm redirectTo={redirectTo} />
    </div>
  )
}
