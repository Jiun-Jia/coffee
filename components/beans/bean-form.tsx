'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { createBean, updateBean } from '@/app/(app)/beans/actions'
import { ROAST_LEVEL_OPTIONS } from '@/lib/validations/enums'
import { beanSchema, type BeanInput } from '@/lib/validations/bean'

type BeanFormProps = {
  /** 編輯模式：既有豆子 id */
  beanId?: string
  defaultValues?: Partial<BeanInput>
  /**
   * inline 模式（BEAN-9）：提交成功後不導頁、改呼叫此回呼（帶回完整輸入值）。
   * 同時預設收合選填欄位（D6：沖煮中斷感最小化）。
   */
  onSuccess?: (id: string, values: BeanInput) => void
}

const EMPTY_VALUES: BeanInput = {
  roaster: '',
  name_batch: '',
  origin: '',
  varietal: '',
  process: '',
  altitude: '',
  farm: '',
  roast_level: 'medium_light',
  roast_date: '',
  notes: '',
}

export function BeanForm({ beanId, defaultValues, onSuccess }: BeanFormProps) {
  const router = useRouter()
  const inline = Boolean(onSuccess)
  const [showOptional, setShowOptional] = useState(!inline)

  const form = useForm<BeanInput>({
    resolver: zodResolver(beanSchema),
    defaultValues: { ...EMPTY_VALUES, ...defaultValues },
  })

  async function onSubmit(values: BeanInput) {
    const result = beanId
      ? await updateBean(beanId, values)
      : await createBean(values)

    if (!result.ok) {
      form.setError('root', { message: result.error })
      return
    }

    if (onSuccess) {
      onSuccess(result.id, values)
      return
    }
    toast.success(beanId ? '豆子已更新' : '豆子已新增')
    router.push(`/beans/${result.id}`)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="roaster"
            render={({ field }) => (
              <FormItem>
                <FormLabel>烘豆店家 / 品牌 *</FormLabel>
                <FormControl>
                  <Input placeholder="例：Fika Fika" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name_batch"
            render={({ field }) => (
              <FormItem>
                <FormLabel>豆名 / 批次 *</FormLabel>
                <FormControl>
                  <Input placeholder="例：Ethiopia Guji G1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="origin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>產地 *</FormLabel>
                <FormControl>
                  <Input placeholder="例：衣索比亞 Guji" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="roast_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>焙度 *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="選擇焙度" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ROAST_LEVEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="roast_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>烘焙日期 *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!showOptional && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setShowOptional(true)}
          >
            <ChevronDown className="size-4" />
            更多欄位（品種 / 處理法 / 海拔…）
          </Button>
        )}

        <div
          className={cn('grid gap-4 sm:grid-cols-2', !showOptional && 'hidden')}
        >
          <FormField
            control={form.control}
            name="varietal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>品種</FormLabel>
                <FormControl>
                  <Input placeholder="例：Heirloom" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="process"
            render={({ field }) => (
              <FormItem>
                <FormLabel>處理法</FormLabel>
                <FormControl>
                  <Input placeholder="例：水洗" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="altitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>海拔</FormLabel>
                <FormControl>
                  <Input placeholder="例：1900–2100m" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="farm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>莊園 / 處理廠</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>備註</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {form.formState.errors.root && (
          <p className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          {!inline && (
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              取消
            </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {beanId ? '儲存變更' : '新增豆子'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
