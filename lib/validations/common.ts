import { z } from 'zod'

/**
 * 共用欄位規則。上下界需與 DB check 約束一字不差對齊
 * （supabase/migrations 為單一事實來源）。
 */

/** 感官評分 1–5 整數（FR-3.5） */
export const score1to5 = z
  .number()
  .int('評分必須是整數')
  .min(1, '評分最低 1 分')
  .max(5, '評分最高 5 分')

/** 水溫 60–100°C 整數 */
export const waterTempC = z
  .number()
  .int('水溫必須是整數')
  .min(60, '水溫最低 60°C')
  .max(100, '水溫最高 100°C')

/** 正數重量（g），上限對齊 numeric(6,2) */
export const positiveGrams = z
  .number()
  .positive('必須大於 0')
  .max(9999.99, '數值過大')

/** 非負重量（g） */
export const nonNegGrams = z
  .number()
  .min(0, '不可為負數')
  .max(9999.99, '數值過大')

/** 非負秒數整數（Q4：時間一律存秒） */
export const nonNegSeconds = z
  .number()
  .int('秒數必須是整數')
  .min(0, '不可為負數')

/** 表單空字串/null/NaN → undefined，讓 .optional() 正常運作 */
export function emptyToUndefined(value: unknown): unknown {
  if (value === '' || value === null) return undefined
  if (typeof value === 'number' && Number.isNaN(value)) return undefined
  return value
}

/**
 * 選填字串：trim 後為空即視為未填。
 * 用 transform 而非 preprocess，讓 z.input 維持 string（RHF resolver 型別才對得上）。
 */
export const optionalTrimmedString = z
  .string()
  .trim()
  .max(500, '字數過多')
  .transform((v) => (v === '' ? undefined : v))
  .optional()

/** 選填數值欄位包裝 */
export function optionalNumber<T extends z.ZodType>(schema: T) {
  return z.preprocess(emptyToUndefined, schema.optional())
}

/** 日期字串 YYYY-MM-DD（前後端一律以字串傳遞，避免時區位移） */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式須為 YYYY-MM-DD')
