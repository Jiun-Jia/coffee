'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
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
import { ComboboxInput } from '@/components/forms/combobox-input'
import { cn } from '@/lib/utils'
import { createBean, updateBean } from '@/app/(app)/beans/actions'
import { showInvalidToast } from '@/lib/form-errors'
import { PROCESS_PRESETS } from '@/lib/presets'
import { ROAST_LEVEL_OPTIONS } from '@/lib/validations/enums'
import { beanSchema, type BeanInput } from '@/lib/validations/bean'

const FIELD_LABELS: Record<string, string> = {
  roaster: '烘豆店家/品牌',
  name_batch: '豆名/批次',
  origin: '產地',
  roast_level: '焙度',
  roast_date: '烘焙日期',
}

/** 表單值：group_id 以 ''＝個人（schema transform 成 null 落庫） */
type BeanFormValues = Omit<BeanInput, 'group_id'> & { group_id: string }

type BeanFormProps = {
  /** 編輯模式：既有豆子 id */
  beanId?: string
  defaultValues?: Partial<BeanFormValues>
  /** FR-10.4：可選的群組歸屬（無群組時不顯示欄位）。inline 模式不傳＝個人豆 */
  groups?: { id: string; name: string }[]
  /**
   * inline 模式（BEAN-9）：提交成功後不導頁、改呼叫此回呼（帶回完整輸入值）。
   * 同時預設收合選填欄位（D6：沖煮中斷感最小化）。
   */
  onSuccess?: (id: string, values: BeanInput) => void
}

const EMPTY_VALUES = {
  roaster: '',
  name_batch: '',
  origin: '',
  group_id: '',
  varietal: '',
  process: '',
  altitude: '',
  farm: '',
  roast_level: 'medium_light' as const,
  roast_date: '',
  purchase_weight_g: null,
  price: null,
  notes: '',
}

export function BeanForm({
  beanId,
  defaultValues,
  groups,
  onSuccess,
}: BeanFormProps) {
  const router = useRouter()
  const inline = Boolean(onSuccess)
  const [showOptional, setShowOptional] = useState(!inline)

  const form = useForm<BeanFormValues>({
    // group_id 的 input（''|uuid）與 output（null|uuid）不同，需 cast；
    // server action 會以同一 schema 再驗一次
    resolver: zodResolver(beanSchema) as unknown as Resolver<BeanFormValues>,
    defaultValues: { ...EMPTY_VALUES, ...defaultValues },
  })

  async function onSubmit(values: BeanFormValues) {
    const payload = values as unknown as BeanInput
    const result = beanId
      ? await updateBean(beanId, payload)
      : await createBean(payload)

    if (!result.ok) {
      form.setError('root', { message: result.error })
      return
    }

    if (onSuccess) {
      onSuccess(result.id, payload)
      return
    }
    toast.success(beanId ? '豆子已更新' : '豆子已新增')
    router.push(`/beans/${result.id}`)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) =>
          showInvalidToast(errors, FIELD_LABELS),
        )}
        className="space-y-4"
      >
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
          {groups && groups.length > 0 && (
            <FormField
              control={form.control}
              name="group_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>歸屬</FormLabel>
                  <Select
                    onValueChange={(v) =>
                      field.onChange(v === '__personal' ? '' : v)
                    }
                    value={field.value === '' ? '__personal' : field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__personal">個人</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          群組：{g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    群組豆對全體成員可見，成員都能記錄沖煮
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
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
                  <ComboboxInput
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    options={[...PROCESS_PRESETS]}
                    placeholder="選擇或輸入處理法"
                  />
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
            name="purchase_weight_g"
            render={({ field }) => (
              <FormItem>
                <FormLabel>購入重量（g）</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step={1}
                    inputMode="decimal"
                    placeholder="例：200"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === '' ? null : e.target.valueAsNumber,
                      )
                    }
                  />
                </FormControl>
                <FormDescription>
                  填了就會自動追蹤剩餘量（FR-15）
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>價格（NT$）</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step={1}
                    inputMode="numeric"
                    placeholder="例：450"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === '' ? null : e.target.valueAsNumber,
                      )
                    }
                  />
                </FormControl>
                <FormDescription>
                  搭配購入重量可算每杯成本（FR-18）
                </FormDescription>
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
