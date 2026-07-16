/**
 * FR-15 豆量庫存的純計算（INV-2）。
 * 剩餘量 = 購入重量 − 沖煮粉量加總（群組豆計全員，加總已在 bean_usage view 完成）。
 */

export type BeanInventory = {
  /** 剩餘克數（可為負：實際損耗常大於帳面） */
  remainingG: number
  /** 預估還能沖幾杯（以該豆平均粉量估算；無沖煮紀錄時 null） */
  estCupsLeft: number | null
  /** 剩餘不足一杯（FR-15.2 提示） */
  lowStock: boolean
  /** 剩餘 ≤ 0（FR-15.4 建議封存） */
  depleted: boolean
}

/** 未填購入重量 → null（不顯示庫存資訊，FR-15.5 向下相容） */
export function beanInventory(
  purchaseWeightG: number | null,
  totalDoseG: number | null,
  avgDoseG: number | null,
): BeanInventory | null {
  if (purchaseWeightG == null) return null
  const remainingG = Math.round((purchaseWeightG - (totalDoseG ?? 0)) * 10) / 10
  const depleted = remainingG <= 0
  const hasAvg = avgDoseG != null && avgDoseG > 0
  return {
    remainingG,
    estCupsLeft: depleted ? 0 : hasAvg ? Math.floor(remainingG / avgDoseG) : null,
    lowStock: depleted || (hasAvg && remainingG < avgDoseG),
    depleted,
  }
}

/**
 * FR-18.2 每杯成本（NT$，四捨五入到整數）＝ 價格 ×（該杯粉量 ÷ 購入重量）。
 * 價格或購入重量缺一 → null。
 */
export function perCupCost(
  price: number | null,
  purchaseWeightG: number | null,
  doseG: number | null,
): number | null {
  if (price == null || purchaseWeightG == null || purchaseWeightG <= 0) return null
  if (doseG == null || doseG <= 0) return null
  return Math.round((price * doseG) / purchaseWeightG)
}
