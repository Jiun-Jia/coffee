/**
 * 純函式模組：時間 m:ss、水粉比 1:NN、養豆天數的計算/顯示/解析。
 * 前後端共用，無外部相依。
 *
 * 口徑約定（與 DB 的 brew_details view 一致，見 supabase/migrations）：
 * - 水粉比四捨五入到一位小數（Postgres round(numeric, 1)）
 * - 養豆天數以「本地日期」相減（view 端以 Asia/Taipei 取日）
 */

/** 秒數 → "m:ss"（如 150 → "2:30"、30 → "0:30"）。負數或非有限值回傳空字串。 */
export function formatSecondsToMSS(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return ''
  const s = Math.round(sec)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

/**
 * 解析時間輸入為秒數。接受 "m:ss"（秒 0–59，可一位數）或純數字（視為秒）。
 * 非法輸入回傳 null。
 */
export function parseTimeToSeconds(input: string): number | null {
  const raw = input.trim()
  if (raw === '') return null
  if (/^\d+$/.test(raw)) return Number.parseInt(raw, 10)
  const m = /^(\d+):(\d{1,2})$/.exec(raw)
  if (!m) return null
  const seconds = Number.parseInt(m[2], 10)
  if (seconds > 59) return null
  return Number.parseInt(m[1], 10) * 60 + seconds
}

/**
 * 水粉比數值：(水量 + 計入時的冰量) ÷ 粉量，四捨五入到一位小數。
 * 粉量不為正數時回傳 null（避免 NaN/Infinity）。
 */
export function calcRatioValue(
  waterG: number,
  doseG: number,
  iceG: number | null | undefined,
  includeIce: boolean,
): number | null {
  if (!Number.isFinite(waterG) || !Number.isFinite(doseG) || doseG <= 0)
    return null
  const water = waterG + (includeIce ? (iceG ?? 0) : 0)
  return Math.round((water / doseG) * 10) / 10
}

/** 水粉比顯示（D21：一律一位小數，如 16 → "1:16.0"）。 */
export function formatRatio(value: number): string {
  return `1:${value.toFixed(1)}`
}

/**
 * 養豆天數 = 沖煮「本地日期」− 烘焙日期（"YYYY-MM-DD"）。
 * 以 UTC 午夜相減避免 DST 影響；roastDate 非法時回傳 null。
 * 允許負值（未來烘焙日），顯示層自行處理。
 */
export function calcRestDays(brewedAt: Date, roastDate: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(roastDate)
  if (!m) return null
  const roastUtc = Date.UTC(
    Number.parseInt(m[1], 10),
    Number.parseInt(m[2], 10) - 1,
    Number.parseInt(m[3], 10),
  )
  const brewUtc = Date.UTC(
    brewedAt.getFullYear(),
    brewedAt.getMonth(),
    brewedAt.getDate(),
  )
  return Math.round((brewUtc - roastUtc) / 86_400_000)
}
