import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ReactElement } from 'react'
import {
  calcRatioValue,
  calcRestDays,
  formatRatio,
  formatSecondsToMSS,
} from '@/lib/format'
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

/** 沖煮步驟列（垂直展開，2026-07-16 回饋：欄位對齊取代 · 分隔、手法必列） */
type CardStep = {
  label: string
  time: string
  water: string
  note: string
  /** 總時間列以主色強調 */
  emphasis?: boolean
}

type CardModel = {
  kicker: string
  /** 右上角小標（養豆天數） */
  corner?: string
  title: string
  subtitle: string
  chips: { label: string; value: string }[]
  /** 沖煮步驟：悶蒸 → 各分段（時間/累積水量/手法）→ 總時間 */
  steps: CardStep[]
  starLine: string
  footer: string
}

type PourStep = {
  end_time_sec: number | null
  cumulative_water_g: number | null
  note: string | null
}

/** 沖煮參數 chips（2026-07-16 回饋：粉量/水量分開、口徑直白） */
function brewChips(brew: {
  water_temp: number | null
  dose_g: number
  water_g: number
  ice_g: number | null
  ratio_include_ice: boolean
}): { label: string; value: string }[] {
  const ratio = calcRatioValue(
    brew.water_g,
    brew.dose_g,
    brew.ice_g,
    brew.ratio_include_ice,
  )
  return [
    brew.water_temp != null && {
      label: '水溫',
      value: `${brew.water_temp}°C`,
    },
    { label: '粉量', value: `${brew.dose_g}g` },
    { label: '總注水量', value: `${brew.water_g}g` },
    ratio != null && { label: '水粉比', value: formatRatio(ratio) },
  ].filter((c): c is { label: string; value: string } => Boolean(c))
}

/** 手法截斷（卡面單行；完整內容在分享頁） */
function truncateNote(note: string | null, max = 9): string {
  if (!note) return ''
  return note.length > max ? `${note.slice(0, max)}…` : note
}

/** 悶蒸 → 各分段 → 總時間 的垂直步驟（最多 5 段，超出以「還有 N 段」帶過） */
function pourSteps(
  pours: PourStep[],
  bloomTimeSec: number | null,
  bloomWaterG: number | null,
  totalTimeSec: number | null,
): CardStep[] {
  const steps: CardStep[] = []
  if (bloomTimeSec != null) {
    steps.push({
      label: '悶蒸',
      time: formatSecondsToMSS(bloomTimeSec),
      water: bloomWaterG != null ? `${bloomWaterG}g` : '',
      note: '',
    })
  }
  const valid = pours.filter(
    (p) => p.end_time_sec != null || p.cumulative_water_g != null || p.note,
  )
  const MAX_SEGMENTS = 5
  valid.slice(0, MAX_SEGMENTS).forEach((p, i) => {
    steps.push({
      label: `第 ${i + 1} 段`,
      time: p.end_time_sec != null ? formatSecondsToMSS(p.end_time_sec) : '—',
      water: p.cumulative_water_g != null ? `${p.cumulative_water_g}g` : '',
      note: truncateNote(p.note),
    })
  })
  if (valid.length > MAX_SEGMENTS) {
    steps.push({
      label: '…',
      time: '',
      water: '',
      note: `還有 ${valid.length - MAX_SEGMENTS} 段（見分享頁）`,
    })
  }
  if (totalTimeSec != null) {
    steps.push({
      label: '總時間',
      time: formatSecondsToMSS(totalTimeSec),
      water: '',
      note: '',
      emphasis: true,
    })
  }
  return steps
}

/** 分享資料 → 卡面內容（brew＝配方卡；bean＝豆卡＝最佳一杯） */
export function toCardModel(shared: SharedData): CardModel {
  if (shared.type === 'brew') {
    const { brew } = shared
    const bean = brew.beans
    const restDays = bean
      ? calcRestDays(new Date(brew.brewed_at), bean.roast_date)
      : null
    return {
      kicker: `Brewlog 配方卡 · ${BREW_TYPE_LABELS[brew.brew_type]}`,
      corner:
        restDays != null && restDays >= 0
          ? `養豆 第 ${restDays} 天`
          : undefined,
      title: bean?.name_batch ?? '手沖紀錄',
      subtitle: bean
        ? `${bean.roaster} · ${bean.origin} · ${ROAST_LEVEL_LABELS[bean.roast_level]}`
        : '',
      chips: brewChips(brew),
      steps: pourSteps(
        shared.pours,
        brew.bloom_time_sec,
        brew.bloom_water_g,
        brew.total_time_sec,
      ),
      starLine: stars(brew.overall),
      footer: [
        brew.profiles?.username && `沖煮人 ${brew.profiles.username}`,
        brew.brewed_at.slice(0, 10),
      ]
        .filter(Boolean)
        .join(' · '),
    }
  }

  const { bean, best } = shared
  // 豆卡的主角＝分享者的「最佳一杯」（含注水分段；2026-07-16 回饋）
  if (best) {
    const restDays = calcRestDays(new Date(best.brewed_at), bean.roast_date)
    return {
      kicker: 'Brewlog 豆子分享 · 我的最佳沖法',
      corner:
        restDays != null && restDays >= 0
          ? `養豆 第 ${restDays} 天`
          : undefined,
      title: bean.name_batch,
      subtitle: `${bean.roaster} · ${bean.origin} · ${ROAST_LEVEL_LABELS[bean.roast_level]}${bean.process ? ` · ${bean.process}` : ''}`,
      chips: brewChips(best),
      steps: pourSteps(
        best.pours,
        best.bloom_time_sec,
        best.bloom_water_g,
        best.total_time_sec,
      ),
      starLine: stars(best.overall),
      footer: [
        bean.profiles?.username && `分享者 ${bean.profiles.username}`,
        `${shared.brews.length} 筆沖煮`,
      ]
        .filter(Boolean)
        .join(' · '),
    }
  }

  // 還沒有沖煮紀錄：退回豆況卡
  return {
    kicker: 'Brewlog 豆子分享',
    title: bean.name_batch,
    subtitle: `${bean.roaster} · ${bean.origin} · ${ROAST_LEVEL_LABELS[bean.roast_level]}`,
    chips: [
      bean.varietal && { label: '品種', value: bean.varietal },
      bean.process && { label: '處理法', value: bean.process },
      { label: '烘焙日期', value: bean.roast_date },
    ].filter((c): c is { label: string; value: string } => Boolean(c)),
    steps: [],
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
  const hasSteps = model.steps.length > 0
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
        padding: 56,
        fontFamily: 'Noto Sans TC',
      }}
    >
      {/* 頁首：kicker＋右上角養豆 / 豆名 / 副標 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', fontSize: 27, color: ACCENT }}>
            {model.kicker}
          </div>
          {model.corner && (
            <div
              style={{
                display: 'flex',
                fontSize: 24,
                color: MUTED,
                backgroundColor: PANEL,
                borderRadius: 999,
                padding: '8px 20px',
              }}
            >
              {model.corner}
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 62,
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {model.title}
        </div>
        {model.subtitle && (
          <div style={{ display: 'flex', fontSize: 29, color: MUTED }}>
            {model.subtitle}
          </div>
        )}
      </div>

      {/* 主體：左＝參數塊＋星等；右＝沖煮步驟（垂直，時間/水量/手法對齊欄） */}
      <div style={{ display: 'flex', gap: 28, alignItems: 'stretch' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexGrow: 1,
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {model.chips.map((chip) => (
              <div
                key={chip.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  backgroundColor: PANEL,
                  borderRadius: 16,
                  padding: '16px 26px',
                }}
              >
                <div style={{ display: 'flex', fontSize: 21, color: MUTED }}>
                  {chip.label}
                </div>
                <div style={{ display: 'flex', fontSize: 34, fontWeight: 700 }}>
                  {chip.value}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', fontSize: 44, color: ACCENT }}>
            {model.starLine}
          </div>
        </div>

        {hasSteps && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
              width: 470,
              backgroundColor: PANEL,
              borderRadius: 20,
              padding: '20px 26px',
            }}
          >
            <div style={{ display: 'flex', fontSize: 20, color: MUTED }}>
              沖煮步驟
            </div>
            {model.steps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  fontSize: 22,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: 92,
                    color: step.emphasis ? ACCENT : MUTED,
                    flexShrink: 0,
                  }}
                >
                  {step.label}
                </div>
                <div
                  style={{
                    display: 'flex',
                    width: 80,
                    fontWeight: 700,
                    color: step.emphasis ? ACCENT : INK,
                    flexShrink: 0,
                  }}
                >
                  {step.time}
                </div>
                <div style={{ display: 'flex', width: 82, flexShrink: 0 }}>
                  {step.water}
                </div>
                <div style={{ display: 'flex', color: MUTED }}>{step.note}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 頁尾 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          fontSize: 24,
          color: MUTED,
        }}
      >
        {model.footer}
      </div>
    </div>
  )
}
