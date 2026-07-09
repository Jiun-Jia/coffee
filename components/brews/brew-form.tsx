'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { RatingInput } from '@/components/brews/rating-input'
import { TimeInput } from '@/components/brews/time-input'
import { createBrew, updateBrew } from '@/app/(app)/brews/actions'
import { calcRatioValue, calcRestDays, formatRatio } from '@/lib/format'
import { BREW_TYPE_OPTIONS } from '@/lib/validations/enums'
import { brewSchema, type BrewInput } from '@/lib/validations/brew'
import type { BrewType } from '@/lib/validations/enums'

/** 表單選項用的精簡型別（由 Server Component 傳入） */
export type BeanOption = {
  id: string
  name_batch: string
  roaster: string
  roast_date: string
}
export type GrinderOption = { id: string; name: string }

/**
 * 表單值型別（各欄位由受控元件保證型別）；
 * 提交前經 brewSchema 於 client + server 各驗一次。
 */
type BrewFormValues = {
  bean_id: string
  brew_type: BrewType
  brewed_at: string // datetime-local 格式，提交時轉 ISO（時區風險 #5）
  dripper: string
  filter: string
  grinder_id: string // '' = 未選
  grind_setting: string
  kettle: string
  water_temp?: number
  dose_g?: number
  water_g?: number
  ice_g?: number
  ratio_include_ice: boolean
  bloom_water_g?: number
  bloom_time_sec?: number
  pour_notes: string
  total_time_sec?: number
  aroma?: number
  acidity?: number
  sweetness?: number
  bitterness?: number
  body?: number
  balance?: number
  aftertaste?: number
  overall?: number
  tag_ids: string[]
  flavor_notes: string
  next_adjustment: string
  notes: string
}

const SENSORY_FIELDS = [
  { name: 'aroma', label: '香氣' },
  { name: 'acidity', label: '酸質' },
  { name: 'sweetness', label: '甜感' },
  { name: 'bitterness', label: '苦味' },
  { name: 'body', label: '口感 / 醇厚度' },
  { name: 'balance', label: '平衡感' },
  { name: 'aftertaste', label: '餘韻' },
] as const

/** 本地當下時間 → datetime-local 值（client 專用，避免 SSR 時區/水合不一致） */
function localNowValue(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function BrewForm({
  beans,
  grinders,
  brewId,
  defaultValues,
}: {
  beans: BeanOption[]
  grinders: GrinderOption[]
  brewId?: string
  defaultValues?: Partial<BrewFormValues>
}) {
  const router = useRouter()

  const form = useForm<BrewFormValues>({
    // brewSchema 含 preprocess/default，z.input 不適合直接當表單型別；
    // BrewFormValues 由受控元件保證，故此 cast 安全（server 端會再驗一次）
    resolver: zodResolver(brewSchema) as unknown as Resolver<BrewFormValues>,
    defaultValues: {
      bean_id: '',
      brew_type: 'pour_over',
      brewed_at: '',
      dripper: '',
      filter: '',
      grinder_id: '',
      grind_setting: '',
      kettle: '',
      ratio_include_ice: false,
      pour_notes: '',
      tag_ids: [],
      flavor_notes: '',
      next_adjustment: '',
      notes: '',
      ...defaultValues,
    },
  })

  // 預設「現在」：client mount 後設定，避免 SSR（UTC）與瀏覽器時區不一致
  useEffect(() => {
    if (!form.getValues('brewed_at')) {
      form.setValue('brewed_at', localNowValue())
    }
  }, [form])

  const [beanId, brewType, brewedAt, doseG, waterG, iceG, includeIce, grinderId] =
    useWatch({
      control: form.control,
      name: [
        'bean_id',
        'brew_type',
        'brewed_at',
        'dose_g',
        'water_g',
        'ice_g',
        'ratio_include_ice',
        'grinder_id',
      ],
    })

  const iced = brewType === 'iced_pour_over'
  const selectedBean = beans.find((b) => b.id === beanId)

  // FR-4.1 養豆天數（D10：負值顯示「尚未烘焙」）
  const restDays =
    selectedBean && brewedAt
      ? calcRestDays(new Date(brewedAt), selectedBean.roast_date)
      : null
  const restLabel =
    restDays === null ? '—' : restDays < 0 ? '尚未烘焙' : `${restDays} 天`

  // FR-4.2 水粉比即時顯示（口徑與 brew_details view 一致）
  const ratio =
    doseG != null && waterG != null
      ? calcRatioValue(waterG, doseG, iceG ?? null, includeIce)
      : null

  async function onSubmit(values: BrewFormValues) {
    // datetime-local（使用者本地時間）→ ISO；在 client 轉換，
    // 伺服器（Vercel = UTC）轉會差 8 小時（風險 #5）
    const payload = {
      ...values,
      brewed_at: new Date(values.brewed_at).toISOString(),
    } as unknown as BrewInput

    const result = brewId
      ? await updateBrew(brewId, payload)
      : await createBrew(payload)

    if (!result.ok) {
      form.setError('root', { message: result.error })
      return
    }
    toast.success(brewId ? '沖煮紀錄已更新' : '沖煮紀錄已儲存')
    router.push(`/brews/${result.id}`)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── 基本 ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="bean_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>豆子 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="選擇豆子" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {beans.map((bean) => (
                        <SelectItem key={bean.id} value={bean.id}>
                          {bean.name_batch}（{bean.roaster}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {beans.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      還沒有豆子，先到
                      <Link href="/beans/new" className="underline">
                        新增豆子
                      </Link>
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brew_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>沖煮類型 *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      // D12：切冰手沖 → 計入冰量預設開；切回手沖 → 清空冰量
                      if (value === 'iced_pour_over') {
                        form.setValue('ratio_include_ice', true)
                      } else {
                        form.setValue('ice_g', undefined)
                        form.setValue('ratio_include_ice', false)
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BREW_TYPE_OPTIONS.map((opt) => (
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
              name="brewed_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>日期時間 *</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-end pb-2 text-sm">
              <span className="text-muted-foreground">養豆天數：</span>
              <span className="font-medium">{restLabel}</span>
              <span className="text-muted-foreground ml-1">（自動）</span>
            </div>
          </CardContent>
        </Card>

        {/* ── 器材 ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">器材</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="dripper"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>濾杯</FormLabel>
                  <FormControl>
                    <Input placeholder="例：V60-01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="filter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>濾紙</FormLabel>
                  <FormControl>
                    <Input placeholder="例：Cafec 漂白" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grinder_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>磨豆機</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
                    value={field.value === '' ? 'none' : field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="選擇磨豆機" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">未指定</SelectItem>
                      {grinders.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {grinders.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      可先到
                      <Link href="/settings" className="underline">
                        設定
                      </Link>
                      新增磨豆機
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grind_setting"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>刻度</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        grinderId ? '例：22 clicks' : '先選磨豆機（FR-3.9）'
                      }
                      disabled={!grinderId}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kettle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>手沖壺</FormLabel>
                  <FormControl>
                    <Input placeholder="例：Fellow Stagg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── 沖煮變因 ─────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">沖煮變因</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <NumberField
                control={form.control}
                name="water_temp"
                label="水溫（°C）"
                step={1}
              />
              <NumberField
                control={form.control}
                name="dose_g"
                label="粉量（g）*"
                step={0.1}
              />
              <NumberField
                control={form.control}
                name="water_g"
                label="水量（g）*"
                step={1}
              />
              {iced && (
                <NumberField
                  control={form.control}
                  name="ice_g"
                  label="冰量（g）"
                  step={1}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">水粉比：</span>
                <span className="font-medium">
                  {ratio != null ? formatRatio(ratio) : '—'}
                </span>
                <span className="text-muted-foreground ml-1">（自動）</span>
              </div>
              {iced && (
                <FormField
                  control={form.control}
                  name="ratio_include_ice"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0 font-normal">
                        水粉比計入冰量
                      </FormLabel>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <NumberField
                control={form.control}
                name="bloom_water_g"
                label="悶蒸水量（g）"
                step={1}
              />
              <FormField
                control={form.control}
                name="bloom_time_sec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>悶蒸時間</FormLabel>
                    <FormControl>
                      <TimeInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0:30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_time_sec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>總時間</FormLabel>
                    <FormControl>
                      <TimeInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="2:30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="pour_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>注水手法備註</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="例：三段注水，中心繞圈"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── 感官評分 ─────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">感官評分（1–5）</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {SENSORY_FIELDS.map(({ name, label }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <RatingInput
                        value={field.value}
                        onChange={field.onChange}
                        aria-label={label}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="flavor_notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>風味自由補充</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="風味標籤功能即將推出，先以文字記錄"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── 結論 ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">結論</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="overall"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>整體喜好度 *</FormLabel>
                  <FormControl>
                    <RatingInput
                      value={field.value}
                      onChange={field.onChange}
                      allowClear={false}
                      aria-label="整體喜好度"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="next_adjustment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>下次調整方向</FormLabel>
                  <FormControl>
                    <Input placeholder="例：刻度再細一點" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>自由備註</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {form.formState.errors.root && (
          <p className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {brewId ? '儲存變更' : '儲存沖煮紀錄'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

/** 數值欄位：'' ↔ undefined 的受控轉換（schema 端 optionalNumber 對齊） */
function NumberField({
  control,
  name,
  label,
  step,
}: {
  control: ReturnType<typeof useForm<BrewFormValues>>['control']
  name: 'water_temp' | 'dose_g' | 'water_g' | 'ice_g' | 'bloom_water_g'
  label: string
  step: number
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              step={step}
              inputMode="decimal"
              value={field.value ?? ''}
              onChange={(e) =>
                field.onChange(
                  e.target.value === '' ? undefined : e.target.valueAsNumber,
                )
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
