import { z } from 'zod'
import { brewTypeSchema } from './enums'
import {
  nonNegGrams,
  nonNegSeconds,
  optionalNumber,
  optionalTrimmedString,
  positiveGrams,
  waterTempC,
} from './common'

/**
 * Recipe（沖煮配方，FR-14）驗證，對齊 recipes 資料表。
 * 與 brewSchema 的差異：無豆子/日期/感官評分；粉量水量為選填
 * （配方可以只記器材與手法）；名稱必填且 ≤ 60 字（DB check 對齊）。
 */
export const recipeSchema = z.object({
  name: z
    .string('請輸入配方名稱')
    .trim()
    .min(1, '請輸入配方名稱')
    .max(60, '名稱最長 60 字'),
  brew_type: brewTypeSchema.default('pour_over'),
  // 器材
  dripper: optionalTrimmedString,
  filter: optionalTrimmedString,
  kettle: optionalTrimmedString,
  grinder_id: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.uuid().optional(),
  ),
  grind_setting: optionalTrimmedString,
  // 沖煮變因
  water_temp: optionalNumber(waterTempC),
  dose_g: optionalNumber(positiveGrams),
  water_g: optionalNumber(positiveGrams),
  ice_g: optionalNumber(nonNegGrams),
  ratio_include_ice: z.boolean().default(false),
  bloom_water_g: optionalNumber(nonNegGrams),
  bloom_time_sec: optionalNumber(nonNegSeconds),
  total_time_sec: optionalNumber(nonNegSeconds),
  pour_notes: optionalTrimmedString,
  // 注水分段快照（與 brews.pours 同構）
  pours: z
    .array(
      z.object({
        end_time_sec: optionalNumber(nonNegSeconds),
        cumulative_water_g: optionalNumber(positiveGrams),
        note: optionalTrimmedString,
      }),
    )
    .max(12, '分段最多 12 段')
    .default([]),
  notes: optionalTrimmedString,
})

export type RecipeInput = z.infer<typeof recipeSchema>

/** 「存成配方」dialog 的輸入（RCP-2：名稱＋來源沖煮） */
export const saveAsRecipeSchema = z.object({
  brew_id: z.uuid(),
  name: recipeSchema.shape.name,
})
