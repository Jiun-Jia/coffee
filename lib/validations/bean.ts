import { z } from 'zod'
import { roastLevelSchema } from './enums'
import { dateString, optionalTrimmedString } from './common'

/** Bean（一包豆子）驗證，對齊 PRD §7.1 與 beans 資料表 */
export const beanSchema = z.object({
  roaster: z.string().trim().min(1, '請輸入烘豆店家/品牌').max(200),
  name_batch: z.string().trim().min(1, '請輸入豆名/批次').max(200),
  origin: z.string().trim().min(1, '請輸入產地').max(200),
  varietal: optionalTrimmedString,
  process: optionalTrimmedString,
  altitude: optionalTrimmedString,
  farm: optionalTrimmedString,
  roast_level: roastLevelSchema,
  roast_date: dateString,
  notes: optionalTrimmedString,
})

export type BeanInput = z.infer<typeof beanSchema>
