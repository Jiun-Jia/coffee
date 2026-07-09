import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = { title: '重設密碼' }

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
