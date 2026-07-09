import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata: Metadata = { title: '設定新密碼' }

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
