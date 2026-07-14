'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useFieldArray,
  useForm,
  useWatch,
  type Resolver,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, Trash2 } from 'lucide-react'
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
import { BeanQuickAddDialog } from '@/components/beans/bean-quick-add-dialog'
import {
  FlavorTagSelect,
  type TagOption,
} from '@/components/brews/flavor-tag-select'
import { RatingInput } from '@/components/brews/rating-input'
import { TimeInput } from '@/components/brews/time-input'
import { ComboboxInput } from '@/components/forms/combobox-input'
import { createBrew, updateBrew } from '@/app/(app)/brews/actions'
import type { BrewFormValues } from '@/lib/brew-form'
import { showInvalidToast } from '@/lib/form-errors'
import {
  DRIPPER_PRESETS,
  FILTER_PRESETS,
  KETTLE_PRESETS,
} from '@/lib/presets'
import { calcRatioValue, calcRestDays, formatRatio } from '@/lib/format'
import { BREW_TYPE_OPTIONS } from '@/lib/validations/enums'
import { brewSchema, type BrewInput } from '@/lib/validations/brew'

/** 表單選項用的精簡型別（由 Server Component 傳入） */
export type BeanOption = {
  id: string
  name_batch: string
  roaster: string
  roast_date: string
}
export type GrinderOption = { id: string; name: string }
export type EquipmentOptions = {
  dripper: string[]
  filter: string[]
  kettle: string[]
}

const FIELD_LABELS: Record<string, string> = {
  bean_id: '豆子',
  brewed_at: '日期時間',
  water_temp: '水溫',
  dose_g: '粉量',
  water_g: '水量',
  ice_g: '冰量',
  bloom_water_g: '悶蒸水量',
  bloom_time_sec: '悶蒸時間',
  total_time_sec: '總時間',
  overall: '整體喜好度',
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

/** Date → datetime-local 值（client 專用：瀏覽器時區，避免 SSR 水合不一致） */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 使用者清單優先、預設建議墊底（去重） */
function withPresets(own: string[], presets: readonly string[]): string[] {
  const seen = new Set(own)
  return [...own, ...presets.filter((p) => !seen.has(p))]
}

export function BrewForm({
  beans,
  grinders,
  tagOptions,
  equipmentOptions,
  groups = [],
  brewId,
  defaultValues,
  brewedAtISO,
}: {
  beans: BeanOption[]
  grinders: GrinderOption[]
  tagOptions: TagOption[]
  equipmentOptions: EquipmentOptions
  /** FR-5.6：標籤可提交到這些群組審核 */
  groups?: { id: string; name: string }[]
  brewId?: string
  defaultValues?: Partial<BrewFormValues>
  /** 編輯模式：原沖煮時間（ISO），於 client 端轉為瀏覽器時區顯示 */
  brewedAtISO?: string
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
      pours: [],
      tag_ids: [],
      flavor_notes: '',
      next_adjustment: '',
      notes: '',
      ...defaultValues,
    },
  })

  // brewed_at 於 client mount 後設定（瀏覽器時區）：
  // 編輯帶原時間（brewedAtISO）、新增/複製帶「現在」
  useEffect(() => {
    if (!form.getValues('brewed_at')) {
      form.setValue(
        'brewed_at',
        toLocalInputValue(brewedAtISO ? new Date(brewedAtISO) : new Date()),
      )
    }
  }, [form, brewedAtISO])

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

  // BEAN-9：inline 新增的豆子先併入本地選項（server revalidate 前即可選用）
  const [localBeans, setLocalBeans] = useState<BeanOption[]>([])
  const allBeans = useMemo(() => {
    const seen = new Set(beans.map((b) => b.id))
    return [...beans, ...localBeans.filter((b) => !seen.has(b.id))]
  }, [beans, localBeans])

  // FR-11 注水分段動態列
  const pourArray = useFieldArray({ control: form.control, name: 'pours' })

  const iced = brewType === 'iced_pour_over'
  const selectedBean = allBeans.find((b) => b.id === beanId)

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
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) =>
          showInvalidToast(errors, FIELD_LABELS),
        )}
        className="space-y-6"
      >
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
                  <div className="flex items-center justify-between">
                    <FormLabel>豆子 *</FormLabel>
                    <BeanQuickAddDialog
                      onCreated={(bean) => {
                        setLocalBeans((prev) => [...prev, bean])
                        form.setValue('bean_id', bean.id, {
                          shouldValidate: true,
                        })
                      }}
                    />
                  </div>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="選擇豆子" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allBeans.map((bean) => (
                        <SelectItem key={bean.id} value={bean.id}>
                          {bean.name_batch}（{bean.roaster}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {allBeans.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      還沒有豆子，用右上角「新增豆子」快速建立
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
                    <ComboboxInput
                      value={field.value}
                      onChange={field.onChange}
                      options={withPresets(
                        equipmentOptions.dripper,
                        DRIPPER_PRESETS,
                      )}
                      placeholder="選擇或輸入濾杯"
                    />
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
                    <ComboboxInput
                      value={field.value}
                      onChange={field.onChange}
                      options={withPresets(
                        equipmentOptions.filter,
                        FILTER_PRESETS,
                      )}
                      placeholder="選擇或輸入濾紙"
                    />
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
                    <ComboboxInput
                      value={field.value}
                      onChange={field.onChange}
                      options={withPresets(
                        equipmentOptions.kettle,
                        KETTLE_PRESETS,
                      )}
                      placeholder="選擇或輸入手沖壺"
                    />
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
              <NumberField
                control={form.control}
                name="bloom_water_g"
                label="悶蒸水量（g）"
                step={1}
              />
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

            {/* 時間欄位含分/秒下拉，需要半寬以上才放得下（勿塞四欄格） */}
            <div className="grid gap-4 sm:grid-cols-2">
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

        {/* ── 注水分段（FR-11）──────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">注水分段</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pourArray.fields.length === 0 && (
              <p className="text-muted-foreground text-sm">
                選填：逐段記錄「結束時間＋累積水量＋手法」，重現沖煮節奏最關鍵的資訊。
              </p>
            )}
            {pourArray.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[auto_1fr] items-start gap-2 rounded-md border p-2 sm:grid-cols-[auto_2fr_1fr_2fr_auto]"
              >
                <span className="text-muted-foreground pt-2 text-sm">
                  第 {index + 1} 段
                </span>
                <FormField
                  control={form.control}
                  name={`pours.${index}.end_time_sec`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <TimeInput value={f.value} onChange={f.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`pours.${index}.cumulative_water_g`}
                  render={({ field: f }) => (
                    <FormItem className="col-start-2 sm:col-start-auto">
                      <FormControl>
                        <Input
                          type="number"
                          step={1}
                          inputMode="decimal"
                          placeholder="累積水量 g"
                          value={f.value ?? ''}
                          onChange={(e) =>
                            f.onChange(
                              e.target.value === ''
                                ? undefined
                                : e.target.valueAsNumber,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`pours.${index}.note`}
                  render={({ field: f }) => (
                    <FormItem className="col-start-2 sm:col-start-auto">
                      <FormControl>
                        <Input placeholder="手法（中心繞圈…）" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`刪除第 ${index + 1} 段`}
                  className="col-start-2 justify-self-end sm:col-start-auto"
                  onClick={() => pourArray.remove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {pourArray.fields.length < 12 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  pourArray.append({
                    end_time_sec: undefined,
                    cumulative_water_g: undefined,
                    note: '',
                  })
                }
              >
                <Plus className="size-4" />
                新增一段
              </Button>
            )}
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
              name="tag_ids"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>風味標籤</FormLabel>
                  <FormControl>
                    <FlavorTagSelect
                      options={tagOptions}
                      value={field.value}
                      onChange={field.onChange}
                      groups={groups}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="flavor_notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>風味自由補充</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="標籤之外的風味描述"
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
