import { toast } from 'sonner'
import type { FieldErrors, FieldValues } from 'react-hook-form'

/**
 * 送出時必填/格式錯誤的整體提醒（欄位本身仍會亮紅＋顯示訊息，
 * RHF 預設會自動聚焦第一個錯誤欄位）。
 */
export function showInvalidToast<T extends FieldValues>(
  errors: FieldErrors<T>,
  labels: Record<string, string>,
) {
  const names = [
    ...new Set(Object.keys(errors).map((key) => labels[key] ?? key)),
  ]
  if (names.length === 0) return
  toast.error(`請完成以下欄位：${names.join('、')}`)
}
