import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ReactElement } from 'react'
import { calcRatioValue, formatRatio, formatSecondsToMSS } from '@/lib/format'
import type { SharedData } from '@/lib/queries/share'
import { BREW_TYPE_LABELS, ROAST_LEVEL_LABELS } from '@/lib/validations/enums'

/**
 * FR-9.4 配方卡圖片（SHARE-3）：ImageResponse（satori）用的卡面 JSX。
 * satori 限制：僅支援 flexbox、無 CSS 變數——顏色寫死（深咖啡色卡面，
 * 不隨站內主題變）。中文字型用 repo 內建的 Noto Sans TC（assets/fonts，
 * OFL 授權）：曾試 Google Fonts 按需子集，公司網路 TLS 攔截讓 Node
 * 抓不到 gstatic（SELF_SIGNED_CERT_IN_CHAIN），且每次產圖都依賴外部
 * 服務不健康——本地檔案零網路依賴。
 */

const BG = '#201713'
const PANEL = '#2c2118'
const INK = '#f3ece2'
const MUTED = '#b3a596'
const ACCENT = '#d9a45c'

export const CARD_SIZE = { width: 1200, height: 630 }

function stars(n: number | null): string {
  if (n == null) return ''
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n))
}

type CardModel = {
  kicker: string
  title: string
  subtitle: string
  chips: { label: string; value: string }[]
  starLine: string
  footer: string
}

/** 分享資料 → 卡面內容（brew＝配方卡；bean＝豆卡） */
export function toCardModel(shared: SharedData): CardModel {
  if (shared.type === 'brew') {
    const { brew } = shared
    const bean = brew.beans
    const ratio =
      brew.dose_g != null && brew.water_g != null
        ? calcRatioValue(
            brew.water_g,
            brew.dose_g,
            brew.ice_g,
            brew.ratio_include_ice,
          )
        : null
    const chips = [
      brew.water_temp != null && {
        label: '水溫',
        value: `${brew.water_temp}°C`,
      },
      ratio != null && { label: '粉水比', value: formatRatio(ratio) },
      { label: '粉量', value: `${brew.dose_g}g / ${brew.water_g}g` },
      brew.total_time_sec != null && {
        label: '總時間',
        value: formatSecondsToMSS(brew.total_time_sec),
      },
    ].filter((c): c is { label: string; value: string } => Boolean(c))
    return {
      kicker: `Brewlog 配方卡 · ${BREW_TYPE_LABELS[brew.brew_type]}`,
      title: bean?.name_batch ?? '手沖紀錄',
      subtitle: bean
        ? `${bean.roaster} · ${bean.origin} · ${ROAST_LEVEL_LABELS[bean.roast_level]}`
        : '',
      chips,
      starLine: stars(brew.overall),
      footer: [
        brew.profiles?.username && `沖煮人 ${brew.profiles.username}`,
        brew.brewed_at.slice(0, 10),
      ]
        .filter(Boolean)
        .join(' · '),
    }
  }

  const { bean } = shared
  return {
    kicker: 'Brewlog 豆子分享',
    title: bean.name_batch,
    subtitle: `${bean.roaster} · ${bean.origin} · ${ROAST_LEVEL_LABELS[bean.roast_level]}`,
    chips: [
      bean.varietal && { label: '品種', value: bean.varietal },
      bean.process && { label: '處理法', value: bean.process },
      { label: '烘焙日期', value: bean.roast_date },
    ].filter((c): c is { label: string; value: string } => Boolean(c)),
    starLine: '',
    footer: [
      bean.profiles?.username && `分享者 ${bean.profiles.username}`,
      `${shared.brews.length} 筆沖煮`,
    ]
      .filter(Boolean)
      .join(' · '),
  }
}

/** 模組層快取：warm lambda / dev 熱路徑不重讀 5.7MB 檔案 */
let fontPromise: Promise<Buffer | null> | null = null

/** 載入內建 Noto Sans TC（失敗回 null：卡面退回內建拉丁字型，中文缺字但不 500） */
export function loadNotoSansTC(): Promise<Buffer | null> {
  fontPromise ??= readFile(
    join(process.cwd(), 'assets/fonts/NotoSansTC-Medium.otf'),
  ).catch(() => null)
  return fontPromise
}

/** 卡面 JSX（satori：所有多子元素容器都要 display:flex） */
export function ShareCard({ model }: { model: CardModel }): ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: BG,
        color: INK,
        padding: 64,
        fontFamily: 'Noto Sans TC',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', fontSize: 28, color: ACCENT }}>
          {model.kicker}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {model.title}
        </div>
        {model.subtitle && (
          <div style={{ display: 'flex', fontSize: 32, color: MUTED }}>
            {model.subtitle}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {model.chips.map((chip) => (
            <div
              key={chip.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                backgroundColor: PANEL,
                borderRadius: 16,
                padding: '18px 28px',
              }}
            >
              <div style={{ display: 'flex', fontSize: 22, color: MUTED }}>
                {chip.label}
              </div>
              <div style={{ display: 'flex', fontSize: 36, fontWeight: 700 }}>
                {chip.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', fontSize: 44, color: ACCENT }}>
            {model.starLine}
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: MUTED }}>
            {model.footer}
          </div>
        </div>
      </div>
    </div>
  )
}
