import type { BrewFilters } from '@/lib/queries/brews'
import { ROAST_LEVELS, type RoastLevel } from '@/lib/validations/enums'

/** P3 / P9 共用的 URL searchParams 形狀 */
export type BrewSearchParams = {
  q?: string
  bean?: string
  roast?: string
  origin?: string
  process?: string
  roaster?: string
  dripper?: string
  tag?: string
  minOverall?: string
  from?: string
  to?: string
  sort?: string
  dir?: string
}

/** searchParams → 驗證過的查詢參數（未知值一律丟棄） */
export function toBrewFilters(sp: BrewSearchParams): BrewFilters {
  const minOverall = Number(sp.minOverall)
  return {
    q: sp.q || undefined,
    beanId: sp.bean || undefined,
    roastLevel: ROAST_LEVELS.includes(sp.roast as RoastLevel)
      ? (sp.roast as RoastLevel)
      : undefined,
    origin: sp.origin || undefined,
    process: sp.process || undefined,
    roaster: sp.roaster || undefined,
    dripper: sp.dripper || undefined,
    tagId: sp.tag || undefined,
    minOverall:
      Number.isInteger(minOverall) && minOverall >= 1 && minOverall <= 5
        ? minOverall
        : undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
    sort: sp.sort === 'overall' ? 'overall' : 'brewed_at',
    dir: sp.dir === 'asc' ? 'asc' : 'desc',
  }
}
