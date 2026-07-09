import { z } from 'zod'
import { optionalTrimmedString } from './common'

/** Grinder（磨豆機）驗證，對齊 PRD §7.2 與 grinders 資料表 */
export const grinderSchema = z.object({
  name: z.string().trim().min(1, '請輸入磨豆機名稱').max(100),
  burr_type: optionalTrimmedString,
  notes: optionalTrimmedString,
})

export type GrinderInput = z.infer<typeof grinderSchema>
