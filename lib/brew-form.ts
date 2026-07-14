import type { Database } from '@/types/database'
import type { BrewType } from '@/lib/validations/enums'

type BrewDetailRow = Database['public']['Views']['brew_details']['Row']

/**
 * P5 表單的值型別。各欄位由受控元件保證型別；
 * 提交前經 brewSchema 於 client + server 各驗一次。
 */
export type PourFormValue = {
  end_time_sec?: number
  cumulative_water_g?: number
  note: string
}

export type BrewFormValues = {
  bean_id: string
  brew_type: BrewType
  brewed_at: string // datetime-local 格式；由表單於 client 端設定（時區）
  dripper: string
  filter: string
  grinder_id: string // '' = 未選
  grind_setting: string
  kettle: string
  water_temp?: number
  dose_g?: number
  water_g?: number
  ice_g?: number
  ratio_include_ice: boolean
  bloom_water_g?: number
  bloom_time_sec?: number
  pour_notes: string
  total_time_sec?: number
  aroma?: number
  acidity?: number
  sweetness?: number
  bitterness?: number
  body?: number
  balance?: number
  aftertaste?: number
  overall?: number
  pours: PourFormValue[]
  tag_ids: string[]
  flavor_notes: string
  next_adjustment: string
  notes: string
}

/**
 * brew_details row → 表單預設值（編輯 BREW-10 / 複製 BREW-15 共用）。
 * 不含 brewed_at：時間須在 client 端依瀏覽器時區轉換
 * （編輯帶原時間、複製帶「現在」，由 BrewForm 的 effect 處理）。
 */
export function brewRowToFormDefaults(
  brew: BrewDetailRow,
  tagIds: string[],
  pours: {
    end_time_sec: number | null
    cumulative_water_g: number | null
    note: string | null
  }[] = [],
): Partial<BrewFormValues> {
  return {
    pours: pours.map((p) => ({
      end_time_sec: p.end_time_sec ?? undefined,
      cumulative_water_g: p.cumulative_water_g ?? undefined,
      note: p.note ?? '',
    })),
    bean_id: brew.bean_id ?? '',
    brew_type: brew.brew_type ?? 'pour_over',
    dripper: brew.dripper ?? '',
    filter: brew.filter ?? '',
    grinder_id: brew.grinder_id ?? '',
    grind_setting: brew.grind_setting ?? '',
    kettle: brew.kettle ?? '',
    water_temp: brew.water_temp ?? undefined,
    dose_g: brew.dose_g ?? undefined,
    water_g: brew.water_g ?? undefined,
    ice_g: brew.ice_g ?? undefined,
    ratio_include_ice: brew.ratio_include_ice ?? false,
    bloom_water_g: brew.bloom_water_g ?? undefined,
    bloom_time_sec: brew.bloom_time_sec ?? undefined,
    pour_notes: brew.pour_notes ?? '',
    total_time_sec: brew.total_time_sec ?? undefined,
    aroma: brew.aroma ?? undefined,
    acidity: brew.acidity ?? undefined,
    sweetness: brew.sweetness ?? undefined,
    bitterness: brew.bitterness ?? undefined,
    body: brew.body ?? undefined,
    balance: brew.balance ?? undefined,
    aftertaste: brew.aftertaste ?? undefined,
    overall: brew.overall ?? undefined,
    tag_ids: tagIds,
    flavor_notes: brew.flavor_notes ?? '',
    next_adjustment: brew.next_adjustment ?? '',
    notes: brew.notes ?? '',
  }
}
