import type { RoastLevel } from '@/lib/validations/enums'

/**
 * FR-16 適飲期（WIN-1）純計算。
 * 個人化：該豆「我的」有評分沖煮 ≥ 3 → 取整體喜好度前 50% 的
 * 養豆天數 P25–P75 為區間；不足則按焙度預設（§6 決議-2）：
 * 淺 10–30、中淺/中 7–21、中深/深 5–14 天。
 */

export type DrinkingWindow = {
  fromDay: number
  toDay: number
  /** personal＝依你的紀錄；default＝焙度預設 */
  source: 'personal' | 'default'
}

const DEFAULT_WINDOWS: Record<RoastLevel, [number, number]> = {
  light: [10, 30],
  medium_light: [7, 21],
  medium: [7, 21],
  medium_dark: [5, 14],
  dark: [5, 14],
}

/** 分位數（線性插值；輸入需已排序） */
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export function drinkingWindow(
  scoredBrews: { restDays: number; overall: number }[],
  roastLevel: RoastLevel,
): DrinkingWindow {
  const valid = scoredBrews.filter((b) => b.restDays >= 0)
  if (valid.length >= 3) {
    // 前 50%（無條件進位，至少 2 筆）——你的高分沖煮落在哪些天數
    const top = [...valid]
      .sort((a, b) => b.overall - a.overall)
      .slice(0, Math.max(2, Math.ceil(valid.length / 2)))
    const days = top.map((b) => b.restDays).sort((a, b) => a - b)
    return {
      fromDay: Math.round(quantile(days, 0.25)),
      toDay: Math.round(quantile(days, 0.75)),
      source: 'personal',
    }
  }
  const [fromDay, toDay] = DEFAULT_WINDOWS[roastLevel]
  return { fromDay, toDay, source: 'default' }
}

/** 今天（第 restDaysToday 天）是否落在區間內 */
export function inWindow(
  restDaysToday: number,
  window: DrinkingWindow,
): boolean {
  return restDaysToday >= window.fromDay && restDaysToday <= window.toDay
}
