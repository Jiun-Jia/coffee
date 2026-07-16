import type { PourFormValue } from '@/lib/brew-form'

/**
 * FR-13 沖煮計時器的純邏輯（TIMER-1/RCP-5）。
 * 抽離 React 以便 Vitest 直接測（專案測試不跑 DOM）。
 *
 * 「分段」按鈕的語意：
 * - 第 N 次分段對應 pours[N-1]。該列已存在（配方載入或手動預填的
 *   計畫值）→ 覆寫其 end_time_sec 為實際秒數，水量/手法保留；
 * - 該列不存在 → 追加新列。
 * 如此同一顆按鈕同時支援「引導式沖煮（照配方跑）」與「裸計時」。
 */

export const MAX_POURS = 12

/** 一次分段對 pours 的變更紀錄（供撤銷） */
export type LapRecord =
  | { type: 'update'; index: number; prevEndTimeSec: number | undefined }
  | { type: 'append'; index: number }

export type LapPlan =
  | { action: 'update'; index: number }
  | { action: 'append'; index: number }
  | { action: 'full' }

/** 第 lapIndex 次（0-based）分段應該做什麼 */
export function planLap(pours: PourFormValue[], lapIndex: number): LapPlan {
  if (lapIndex < pours.length) return { action: 'update', index: lapIndex }
  if (pours.length >= MAX_POURS) return { action: 'full' }
  return { action: 'append', index: pours.length }
}

/**
 * 下一段的引導目標（RCP-5）：pours[lapCount] 有任一計畫值才視為有目標。
 * 已被覆寫的過去段不會回頭當目標（lapCount 只增不減、撤銷時同步遞減）。
 */
export function nextTarget(
  pours: PourFormValue[],
  lapCount: number,
): PourFormValue | null {
  const t = pours[lapCount]
  if (!t) return null
  const hasValue =
    t.end_time_sec != null || t.cumulative_water_g != null || t.note !== ''
  return hasValue ? t : null
}

/** 實際 vs 目標秒數的偏差標籤：「較目標 +3 秒」；無目標回 null */
export function deviationLabel(
  actualSec: number,
  targetSec: number | undefined,
): string | null {
  if (targetSec == null) return null
  const diff = actualSec - targetSec
  if (diff === 0) return '準時'
  return `較目標 ${diff > 0 ? '+' : '-'}${Math.abs(diff)} 秒`
}

/** epoch 毫秒差 → 整數秒（計時以時間戳重算，背景分頁不失準） */
export function elapsedSeconds(startMs: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - startMs) / 1000))
}

/**
 * 已完成的分段（FR-13.5 專注模式的唯讀清單），最新在前。
 * 直接從表單 pours 推導（前 lapCount 列＝已計時的段）——
 * 資料來源單一，撤銷分段時清單自動同步。
 */
export function completedLaps(
  pours: PourFormValue[],
  lapCount: number,
): { seq: number; pour: PourFormValue }[] {
  return pours
    .slice(0, Math.min(Math.max(lapCount, 0), pours.length))
    .map((pour, i) => ({ seq: i + 1, pour }))
    .reverse()
}
