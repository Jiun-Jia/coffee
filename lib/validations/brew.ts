import { z } from 'zod'
import { brewTypeSchema } from './enums'
import {
  nonNegGrams,
  nonNegSeconds,
  optionalNumber,
  optionalTrimmedString,
  positiveGrams,
  score1to5,
  waterTempC,
} from './common'

/**
 * Brew（單次沖煮）驗證骨架，對齊 PRD §7.3 與 brews 資料表。
 * 時間欄位收「秒數 int」（表單層以 parseTimeToSeconds 轉換）；
 * BREW-1 於 W3 補完與表單的最終對齊。
 */
export const brewSchema = z.object({
  bean_id: z.uuid('請選擇豆子'),
  brew_type: brewTypeSchema.default('pour_over'),
  // 接受本地格式（表單 datetime-local）與含時區的 ISO（client 送出前轉換）
  brewed_at: z.iso.datetime({
    local: true,
    offset: true,
    message: '日期時間格式錯誤',
  }),
  // 器材
  dripper: optionalTrimmedString,
  filter: optionalTrimmedString,
  grinder_id: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.uuid().optional(),
  ),
  grind_setting: optionalTrimmedString,
  kettle: optionalTrimmedString,
  // 沖煮變因
  water_temp: optionalNumber(waterTempC),
  dose_g: positiveGrams,
  water_g: positiveGrams,
  ice_g: optionalNumber(nonNegGrams),
  ratio_include_ice: z.boolean().default(false),
  bloom_water_g: optionalNumber(nonNegGrams),
  bloom_time_sec: optionalNumber(nonNegSeconds),
  pour_notes: optionalTrimmedString,
  total_time_sec: optionalNumber(nonNegSeconds),
  // 感官評分（整體喜好度必填，其餘選填）
  aroma: optionalNumber(score1to5),
  acidity: optionalNumber(score1to5),
  sweetness: optionalNumber(score1to5),
  bitterness: optionalNumber(score1to5),
  body: optionalNumber(score1to5),
  balance: optionalNumber(score1to5),
  aftertaste: optionalNumber(score1to5),
  overall: score1to5,
  // 注水分段（FR-11：每段結束時間點＋累積水量＋手法）
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
  // 風味
  tag_ids: z.array(z.uuid()).default([]),
  flavor_notes: optionalTrimmedString,
  // 結論
  next_adjustment: optionalTrimmedString,
  notes: optionalTrimmedString,
})

export type BrewInput = z.infer<typeof brewSchema>
