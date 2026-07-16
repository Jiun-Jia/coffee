import { z } from 'zod'
import { roastLevelSchema } from './enums'
import {
  dateString,
  emptyToUndefined,
  optionalTrimmedString,
  positiveGrams,
} from './common'

/**
 * 選填數值 → null（非 undefined）：undefined 會被 supabase-js 從
 * update payload 剔除，導致「清空購入重量/價格」寫不進去（同 group_id 註解）。
 */
function nullableNumber<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (v) => (emptyToUndefined(v) === undefined ? null : v),
    schema.nullable(),
  )
}

/** Bean（一包豆子）驗證，對齊 PRD §7.1 與 beans 資料表 */
export const beanSchema = z.object({
  roaster: z.string().trim().min(1, '請輸入烘豆店家/品牌').max(200),
  name_batch: z.string().trim().min(1, '請輸入豆名/批次').max(200),
  origin: z.string().trim().min(1, '請輸入產地').max(200),
  /** FR-10.4 歸屬：null＝個人豆；表單以 '' 表示個人。
   *  轉成 null 而非 undefined —— undefined 會被 supabase-js 從 update
   *  payload 剔除，導致「群組豆改回個人」寫不進去。 */
  group_id: z
    .uuid()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  varietal: optionalTrimmedString,
  process: optionalTrimmedString,
  altitude: optionalTrimmedString,
  farm: optionalTrimmedString,
  roast_level: roastLevelSchema,
  roast_date: dateString,
  // FR-15.1 購入重量（剩餘量計算基準）；FR-18.1 整包價格（NT$ 整數）
  purchase_weight_g: nullableNumber(positiveGrams),
  price: nullableNumber(
    z
      .number('請輸入價格')
      .int('價格須為整數')
      .min(0, '價格不可為負')
      .max(999999, '價格過大'),
  ),
  notes: optionalTrimmedString,
})

export type BeanInput = z.infer<typeof beanSchema>
