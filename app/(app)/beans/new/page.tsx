import type { Metadata } from 'next'
import { BeanForm } from '@/components/beans/bean-form'

export const metadata: Metadata = { title: '新增豆子' }

export default function NewBeanPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">新增豆子</h1>
      <BeanForm />
    </div>
  )
}
