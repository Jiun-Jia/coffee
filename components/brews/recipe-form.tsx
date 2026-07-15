'use client'

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { TimeInput } from '@/components/brews/time-input'
import { ComboboxInput } from '@/components/forms/combobox-input'
import { updateRecipe } from '@/app/(app)/brews/recipes/actions'
import { showInvalidToast } from '@/lib/form-errors'
import {
  formValuesToRecipeInput,
  type RecipeFormValues,
} from '@/lib/recipe-form'
import { BREW_TYPE_OPTIONS } from '@/lib/validations/enums'
import { recipeSchema } from '@/lib/validations/recipe'

const FIELD_LABELS: Record<string, string> = {
  name: '配方名稱',
  water_temp: '水溫',
  dose_g: '粉量',
  water_g: '水量',
  ice_g: '冰量',
  bloom_water_g: '悶蒸水量',
  bloom_time_sec: '悶蒸時間',
  total_time_sec: '總時間',
}

/**
 * RCP-4：配方編輯表單。結構同 BrewForm 的器材/變因/分段區塊，
 * 但無豆子、日期與感官評分（配方與「哪一包豆」無關）。
 */
export function RecipeForm({
  recipeId,
  defaultValues,
  grinders,
  equipmentOptions,
}: {
  recipeId: string
  defaultValues: RecipeFormValues
  grinders: { id: string; name: string }[]
  equipmentOptions: { dripper: string[]; filter: string[]; kettle: string[] }
}) {
  const router = useRouter()

  const form = useForm<RecipeFormValues>({
    // 同 brew-form：schema 含 preprocess/default，受控元件保證型別
    resolver: zodResolver(
      recipeSchema,
    ) as unknown as Resolver<RecipeFormValues>,
    defaultValues,
  })

  const pourArray = useFieldArray({ control: form.control, name: 'pours' })
  const [brewType, grinderId] = useWatch({
    control: form.control,
    name: ['brew_type', 'grinder_id'],
  })
  const iced = brewType === 'iced_pour_over'

  async function onSubmit(values: RecipeFormValues) {
    const result = await updateRecipe(recipeId, formValuesToRecipeInput(values))
    if (!result.ok) {
      form.setError('root', { message: result.error })
      return
    }
    toast.success('配方已更新')
    router.push('/brews/recipes')
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) =>
          showInvalidToast(errors, FIELD_LABELS),
        )}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>配方名稱 *</FormLabel>
                  <FormControl>
                    <Input maxLength={60} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brew_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>沖煮類型</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">器材</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {(
              [
                {
                  name: 'dripper',
                  label: '濾杯',
                  placeholder: '選擇或輸入濾杯',
                },
                {
                  name: 'filter',
                  label: '濾紙',
                  placeholder: '選擇或輸入濾紙',
                },
                {
                  name: 'kettle',
                  label: '手沖壺',
                  placeholder: '選擇或輸入手沖壺',
                },
              ] as const
            ).map(({ name, label, placeholder }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <ComboboxInput
                        value={field.value}
                        onChange={field.onChange}
                        options={equipmentOptions[name]}
                        placeholder={placeholder}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
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
                      placeholder={grinderId ? '例：22 clicks' : '先選磨豆機'}
                      disabled={!grinderId}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

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
                label="粉量（g）"
                step={0.1}
              />
              <NumberField
                control={form.control}
                name="water_g"
                label="水量（g）"
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
                    <FormLabel>總時間（參考）</FormLabel>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">注水分段</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              分段為引導式沖煮的計畫值：載入配方沖煮時，計時器會依此逐段提示。
            </p>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">備註</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="配方心得、出處…"
                      {...field}
                    />
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
            儲存變更
          </Button>
        </div>
      </form>
    </Form>
  )
}

/** 數值欄位：'' ↔ undefined 受控轉換（同 brew-form 慣例） */
function NumberField({
  control,
  name,
  label,
  step,
}: {
  control: ReturnType<typeof useForm<RecipeFormValues>>['control']
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
