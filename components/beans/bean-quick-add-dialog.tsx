'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { BeanForm } from '@/components/beans/bean-form'
import type { BeanOption } from '@/components/brews/brew-form'

/**
 * BEAN-9：沖煮表單內快速新增豆子（FR-2.4）。
 * Radix Dialog 以 Portal 渲染於 body，內嵌的 BeanForm 自帶獨立 <form>，
 * 與外層沖煮表單完全隔離（HTML 不允許巢狀 form）。
 */
export function BeanQuickAddDialog({
  onCreated,
}: {
  onCreated: (bean: BeanOption) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          <Plus className="size-4" />
          新增豆子
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>快速新增豆子</DialogTitle>
        </DialogHeader>
        <BeanForm
          onSuccess={(id, values) => {
            onCreated({
              id,
              name_batch: values.name_batch,
              roaster: values.roaster,
              roast_date: values.roast_date,
              group_id: values.group_id ?? null,
            })
            setOpen(false)
            toast.success(`已新增「${values.name_batch}」並選用`)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
