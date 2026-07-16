import { z } from 'zod'
import type { Database } from '@/types/database'
import type { BrewFormValues, PourFormValue } from '@/lib/brew-form'
// 相對路徑：vitest 未設 '@' alias（lib 內執行期互引一律相對，同 validations 慣例）
import { calcRatioValue, formatRatio, formatSecondsToMSS } from './format'
import type { RecipeInput } from '@/lib/validations/recipe'

export type RecipeRow = Database['public']['Tables']['recipes']['Row']

/**
 * recipes.pours（jsonb 快照）的讀取端驗證：
 * 逐列 safeParse，壞列丟棄（防手動改庫或舊版格式讓頁面炸掉）。
 */
const storedPourSchema = z.object({
  end_time_sec: z.number().int().min(0).nullish(),
  cumulative_water_g: z.number().positive().nullish(),
  note: z.string().nullish(),
})

export function parseRecipePours(json: unknown): PourFormValue[] {
  if (!Array.isArray(json)) return []
  return json.flatMap((item) => {
    const parsed = storedPourSchema.safeParse(item)
    if (!parsed.success) return []
    return [
      {
        end_time_sec: parsed.data.end_time_sec ?? undefined,
        cumulative_water_g: parsed.data.cumulative_water_g ?? undefined,
        note: parsed.data.note ?? '',
      },
    ]
  })
}

/** RecipeFormValues：配方編輯表單（RCP-4）＝ RecipeInput 的受控版 */
export type RecipeFormValues = {
  name: string
  brew_type: BrewFormValues['brew_type']
  dripper: string
  filter: string
  kettle: string
  grinder_id: string
  grind_setting: string
  water_temp?: number
  dose_g?: number
  water_g?: number
  ice_g?: number
  ratio_include_ice: boolean
  bloom_water_g?: number
  bloom_time_sec?: number
  total_time_sec?: number
  pour_notes: string
  pours: PourFormValue[]
  notes: string
}

/** recipes row → 配方編輯表單預設值 */
export function recipeToFormValues(recipe: RecipeRow): RecipeFormValues {
  return {
    name: recipe.name,
    brew_type: recipe.brew_type,
    dripper: recipe.dripper ?? '',
    filter: recipe.filter ?? '',
    kettle: recipe.kettle ?? '',
    grinder_id: recipe.grinder_id ?? '',
    grind_setting: recipe.grind_setting ?? '',
    water_temp: recipe.water_temp ?? undefined,
    dose_g: recipe.dose_g ?? undefined,
    water_g: recipe.water_g ?? undefined,
    ice_g: recipe.ice_g ?? undefined,
    ratio_include_ice: recipe.ratio_include_ice,
    bloom_water_g: recipe.bloom_water_g ?? undefined,
    bloom_time_sec: recipe.bloom_time_sec ?? undefined,
    total_time_sec: recipe.total_time_sec ?? undefined,
    pour_notes: recipe.pour_notes ?? '',
    pours: parseRecipePours(recipe.pours),
    notes: recipe.notes ?? '',
  }
}

/**
 * recipes row → 沖煮表單預設值（RCP-3 載入配方）。
 * 不帶 bean_id（配方與豆無關）；總時間不預填——那是「實際沖了多久」，
 * 由計時器或手動記錄，配方值僅在引導時作為參考。
 */
export function recipeToBrewDefaults(
  recipe: RecipeRow,
): Partial<BrewFormValues> {
  return {
    brew_type: recipe.brew_type,
    dripper: recipe.dripper ?? '',
    filter: recipe.filter ?? '',
    kettle: recipe.kettle ?? '',
    grinder_id: recipe.grinder_id ?? '',
    grind_setting: recipe.grind_setting ?? '',
    water_temp: recipe.water_temp ?? undefined,
    dose_g: recipe.dose_g ?? undefined,
    water_g: recipe.water_g ?? undefined,
    ice_g: recipe.ice_g ?? undefined,
    ratio_include_ice: recipe.ratio_include_ice,
    bloom_water_g: recipe.bloom_water_g ?? undefined,
    bloom_time_sec: recipe.bloom_time_sec ?? undefined,
    pour_notes: recipe.pour_notes ?? '',
    pours: parseRecipePours(recipe.pours),
  }
}

/** 表單值 → server action 的 RecipeInput（受控元件已保證型別，cast 同 brew-form） */
export function formValuesToRecipeInput(values: RecipeFormValues): RecipeInput {
  return values as unknown as RecipeInput
}

/** 一行式參數摘要：92°C · 15g / 225g（1:15）· 悶蒸 0:30 · 總 2:30（配方列表/群組頁共用） */
export function recipeSummary(recipe: RecipeRow): string {
  const parts: string[] = []
  if (recipe.water_temp != null) parts.push(`${recipe.water_temp}°C`)
  if (recipe.dose_g != null && recipe.water_g != null) {
    const ratio = calcRatioValue(
      recipe.water_g,
      recipe.dose_g,
      recipe.ice_g,
      recipe.ratio_include_ice,
    )
    parts.push(
      `${recipe.dose_g}g / ${recipe.water_g}g${ratio != null ? `（${formatRatio(ratio)}）` : ''}`,
    )
  }
  if (recipe.bloom_time_sec != null)
    parts.push(`悶蒸 ${formatSecondsToMSS(recipe.bloom_time_sec)}`)
  if (recipe.total_time_sec != null)
    parts.push(`總 ${formatSecondsToMSS(recipe.total_time_sec)}`)
  return parts.join(' · ')
}
