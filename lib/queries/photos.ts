import { createAdminClient } from '@/lib/supabase/admin'

/**
 * FR-22 照片簽名 URL（PHOTO-1 設計）：bucket 為 private、不開跨人
 * select 政策；「誰能看」由呼叫端先以一般 RLS 讀到 row（含 photo_path）
 * 來判定——讀得到 row 就有資格看照片，這裡才用 service_role 簽名。
 */
export async function getPhotoUrl(
  path: string | null,
  expiresInSec = 3600,
): Promise<string | null> {
  if (!path) return null
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('photos')
    .createSignedUrl(path, expiresInSec)
  if (error) return null // 物件遺失等異常：不顯示照片即可，不炸頁面
  return data.signedUrl
}

/** 批次簽名 URL（列表縮圖用）：path → signedUrl；失敗的路徑直接略過。 */
export async function getPhotoUrls(
  paths: (string | null)[],
  expiresInSec = 3600,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => p !== null))]
  const map = new Map<string, string>()
  if (unique.length === 0) return map

  const admin = createAdminClient()
  const { data } = await admin.storage
    .from('photos')
    .createSignedUrls(unique, expiresInSec)
  for (const item of data ?? []) {
    if (!item.error && item.path && item.signedUrl) {
      map.set(item.path, item.signedUrl)
    }
  }
  return map
}

/** 個人照片用量（設定頁顯示；免費層 1GB 需自我監控）。 */
export async function getPhotoUsage(
  userId: string,
): Promise<{ count: number; bytes: number }> {
  const admin = createAdminClient()
  let count = 0
  let bytes = 0
  for (const folder of [`${userId}/bean`, `${userId}/brew`]) {
    const { data } = await admin.storage
      .from('photos')
      .list(folder, { limit: 1000 })
    for (const f of data ?? []) {
      count += 1
      bytes += (f.metadata as { size?: number } | null)?.size ?? 0
    }
  }
  return { count, bytes }
}
