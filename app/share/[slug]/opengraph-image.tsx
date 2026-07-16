import { ImageResponse } from 'next/og'
import { notFound } from 'next/navigation'
import { fetchShared } from '@/lib/queries/share'
import {
  CARD_SIZE,
  ShareCard,
  loadNotoSansTC,
  toCardModel,
} from '@/lib/share-card'

/**
 * FR-9.4 配方卡圖片（SHARE-3）：同時是分享連結的 og:image
 * （LINE/FB 貼連結出現卡面）與「下載配方卡」按鈕的目標。
 */

export const alt = 'Brewlog 配方卡'
export const size = CARD_SIZE
export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const shared = await fetchShared(slug)
  if (!shared) notFound()

  const model = toCardModel(shared)
  const font = await loadNotoSansTC()

  return new ImageResponse(<ShareCard model={model} />, {
    ...size,
    fonts: font
      ? [{ name: 'Noto Sans TC', data: font, style: 'normal', weight: 500 }]
      : undefined, // 字型抓不到時退回內建拉丁字型（中文會缺字，但不至於 500）
  })
}
