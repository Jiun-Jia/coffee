/**
 * FR-22.2 前端照片壓縮（PHOTO-2，僅瀏覽器可用）：
 * 長邊縮至 ≤1600px、輸出 WebP、逐步降品質直到 ≤500KB
 * （免費層 Storage 1GB，嚴格控制單檔大小）。
 */

const MAX_EDGE = 1600
const TARGET_BYTES = 500 * 1024
const QUALITY_STEPS = [0.82, 0.65, 0.5, 0.35]

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('瀏覽器不支援 canvas')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let best: Blob | null = null
  for (const quality of QUALITY_STEPS) {
    best = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    )
    if (!best) throw new Error('影像轉檔失敗')
    if (best.size <= TARGET_BYTES) return best
  }
  // 全部品質都超標（極端長圖）：回傳最低品質的結果（仍受 1600px 上限保護）
  return best!
}
