import type { Metadata } from 'next'
import { GitCompareArrows } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ComparePicker,
  type CompareOption,
} from '@/components/brews/compare-picker'
import { SensoryRadar } from '@/components/charts/sensory-radar'
import { formatRatio, formatSecondsToMSS } from '@/lib/format'
import {
  getBrew,
  getBrewPours,
  getBrewTags,
  listBrews,
  type BrewDetailRow,
  type BrewPour,
} from '@/lib/queries/brews'
import { listGrinders } from '@/lib/queries/grinders'
import { cn } from '@/lib/utils'
import { BREW_TYPE_LABELS } from '@/lib/validations/enums'

export const metadata: Metadata = { title: '沖煮對照' }

/**
 * FR-17 兩杯沖煮對照（CMP-1/2）：逐列並排、相異變因高亮。
 * 控制變因實驗的核心檢視——「我只改了什麼、結果差多少」。
 * 群組豆可跨成員對照（RLS 限可見範圍）。
 */

type Loaded = {
  brew: BrewDetailRow
  pours: BrewPour[]
  tags: string[]
}

async function loadSide(id: string | undefined): Promise<Loaded | null> {
  if (!id) return null
  const brew = await getBrew(id)
  if (!brew?.id) return null
  const [pours, tags] = await Promise.all([
    getBrewPours(brew.id),
    getBrewTags(brew.id),
  ])
  return { brew, pours, tags: tags.map((t) => t.name) }
}

/** 對照列：兩側皆有值且不同 → 高亮（這就是「改了的變因」） */
function CompareRow({
  label,
  a,
  b,
}: {
  label: string
  a: React.ReactNode
  b: React.ReactNode
}) {
  const aText = a ?? '—'
  const bText = b ?? '—'
  const differs = a != null && b != null && String(a) !== String(b)
  return (
    <div
      className={cn(
        'grid grid-cols-[6.5rem_1fr_1fr] gap-2 rounded px-2 py-1.5 text-sm',
        differs && 'bg-primary/10',
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{aText}</span>
      <span className="min-w-0 break-words">{bText}</span>
    </div>
  )
}

function scoreText(n: number | null) {
  return n != null ? `★${n}` : null
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const { a, b } = await searchParams
  const [allBrews, grinders, sideA, sideB] = await Promise.all([
    listBrews(),
    listGrinders(),
    loadSide(a),
    loadSide(b),
  ])
  const grinderName = new Map(grinders.map((g) => [g.id, g.name]))

  // 選單：全部可見沖煮；已選 A 時把「同豆」排前（對照最常見的情境）
  const toOption = (brew: BrewDetailRow): CompareOption => ({
    id: brew.id ?? '',
    label: `${brew.brewed_at?.slice(0, 10)} ${brew.name_batch}${
      brew.brewer_username ? ` · ${brew.brewer_username}` : ''
    }${brew.overall != null ? ` ★${brew.overall}` : ''}`,
  })
  const options = allBrews.filter((brew) => brew.id).map(toOption)
  const optionsForB = sideA
    ? [
        ...allBrews
          .filter((brew) => brew.id && brew.bean_id === sideA.brew.bean_id)
          .map(toOption),
        ...allBrews
          .filter((brew) => brew.id && brew.bean_id !== sideA.brew.bean_id)
          .map(toOption),
      ]
    : options

  const bothLoaded = sideA && sideB
  const maxPours = Math.max(sideA?.pours.length ?? 0, sideB?.pours.length ?? 0)

  const grinderLabel = (brew: BrewDetailRow) =>
    brew.grinder_id ? (grinderName.get(brew.grinder_id) ?? '（已刪除）') : null

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <GitCompareArrows className="size-6" />
        沖煮對照
      </h1>
      <p className="text-muted-foreground text-sm">
        並排比較兩杯，相異的變因會以底色標出——控制變因，找出好喝的原因（FR-17）
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ComparePicker
          side="a"
          options={options}
          currentId={sideA?.brew.id ?? undefined}
        />
        <ComparePicker
          side="b"
          options={optionsForB}
          currentId={sideB?.brew.id ?? undefined}
        />
      </div>

      {!bothLoaded ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            選好兩杯就開始對照。想比較「只改一個變因」的兩次沖煮最有感。
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基本與器材</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <CompareRow
                label="豆子"
                a={sideA.brew.name_batch}
                b={sideB.brew.name_batch}
              />
              <CompareRow
                label="沖煮人"
                a={sideA.brew.brewer_username}
                b={sideB.brew.brewer_username}
              />
              <CompareRow
                label="日期"
                a={sideA.brew.brewed_at?.slice(0, 10)}
                b={sideB.brew.brewed_at?.slice(0, 10)}
              />
              <CompareRow
                label="類型"
                a={
                  sideA.brew.brew_type && BREW_TYPE_LABELS[sideA.brew.brew_type]
                }
                b={
                  sideB.brew.brew_type && BREW_TYPE_LABELS[sideB.brew.brew_type]
                }
              />
              <CompareRow
                label="濾杯"
                a={sideA.brew.dripper}
                b={sideB.brew.dripper}
              />
              <CompareRow
                label="濾紙"
                a={sideA.brew.filter}
                b={sideB.brew.filter}
              />
              <CompareRow
                label="磨豆機"
                a={grinderLabel(sideA.brew)}
                b={grinderLabel(sideB.brew)}
              />
              <CompareRow
                label="刻度"
                a={sideA.brew.grind_setting}
                b={sideB.brew.grind_setting}
              />
              <CompareRow
                label="手沖壺"
                a={sideA.brew.kettle}
                b={sideB.brew.kettle}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">沖煮變因</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <CompareRow
                label="水溫"
                a={
                  sideA.brew.water_temp != null
                    ? `${sideA.brew.water_temp}°C`
                    : null
                }
                b={
                  sideB.brew.water_temp != null
                    ? `${sideB.brew.water_temp}°C`
                    : null
                }
              />
              <CompareRow
                label="粉量"
                a={sideA.brew.dose_g != null ? `${sideA.brew.dose_g} g` : null}
                b={sideB.brew.dose_g != null ? `${sideB.brew.dose_g} g` : null}
              />
              <CompareRow
                label="總注水量"
                a={
                  sideA.brew.water_g != null ? `${sideA.brew.water_g} g` : null
                }
                b={
                  sideB.brew.water_g != null ? `${sideB.brew.water_g} g` : null
                }
              />
              <CompareRow
                label="冰量"
                a={sideA.brew.ice_g != null ? `${sideA.brew.ice_g} g` : null}
                b={sideB.brew.ice_g != null ? `${sideB.brew.ice_g} g` : null}
              />
              <CompareRow
                label="水粉比"
                a={
                  sideA.brew.ratio_value != null
                    ? formatRatio(sideA.brew.ratio_value)
                    : null
                }
                b={
                  sideB.brew.ratio_value != null
                    ? formatRatio(sideB.brew.ratio_value)
                    : null
                }
              />
              <CompareRow
                label="悶蒸水量"
                a={
                  sideA.brew.bloom_water_g != null
                    ? `${sideA.brew.bloom_water_g} g`
                    : null
                }
                b={
                  sideB.brew.bloom_water_g != null
                    ? `${sideB.brew.bloom_water_g} g`
                    : null
                }
              />
              <CompareRow
                label="悶蒸時間"
                a={
                  sideA.brew.bloom_time_sec != null
                    ? formatSecondsToMSS(sideA.brew.bloom_time_sec)
                    : null
                }
                b={
                  sideB.brew.bloom_time_sec != null
                    ? formatSecondsToMSS(sideB.brew.bloom_time_sec)
                    : null
                }
              />
              <CompareRow
                label="總時間"
                a={
                  sideA.brew.total_time_sec != null
                    ? formatSecondsToMSS(sideA.brew.total_time_sec)
                    : null
                }
                b={
                  sideB.brew.total_time_sec != null
                    ? formatSecondsToMSS(sideB.brew.total_time_sec)
                    : null
                }
              />
            </CardContent>
          </Card>

          {maxPours > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">注水分段</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0.5">
                {Array.from({ length: maxPours }, (_, i) => {
                  const format = (p?: BrewPour) =>
                    p
                      ? [
                          p.end_time_sec != null
                            ? formatSecondsToMSS(p.end_time_sec)
                            : '—',
                          p.cumulative_water_g != null
                            ? `${p.cumulative_water_g}g`
                            : null,
                          p.note,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : null
                  return (
                    <CompareRow
                      key={i}
                      label={`第 ${i + 1} 段`}
                      a={format(sideA.pours[i])}
                      b={format(sideB.pours[i])}
                    />
                  )
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">感官評分</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SensoryRadar
                height={260}
                series={[
                  {
                    id: 'a',
                    label: `A：${sideA.brew.brewed_at?.slice(5, 10)} ${sideA.brew.name_batch}`,
                    scores: {
                      aroma: sideA.brew.aroma,
                      acidity: sideA.brew.acidity,
                      sweetness: sideA.brew.sweetness,
                      bitterness: sideA.brew.bitterness,
                      body: sideA.brew.body,
                      balance: sideA.brew.balance,
                      aftertaste: sideA.brew.aftertaste,
                      overall: sideA.brew.overall,
                    },
                  },
                  {
                    id: 'b',
                    label: `B：${sideB.brew.brewed_at?.slice(5, 10)} ${sideB.brew.name_batch}`,
                    scores: {
                      aroma: sideB.brew.aroma,
                      acidity: sideB.brew.acidity,
                      sweetness: sideB.brew.sweetness,
                      bitterness: sideB.brew.bitterness,
                      body: sideB.brew.body,
                      balance: sideB.brew.balance,
                      aftertaste: sideB.brew.aftertaste,
                      overall: sideB.brew.overall,
                    },
                  },
                ]}
              />
              <div className="space-y-0.5">
                <CompareRow
                  label="香氣"
                  a={scoreText(sideA.brew.aroma)}
                  b={scoreText(sideB.brew.aroma)}
                />
                <CompareRow
                  label="酸質"
                  a={scoreText(sideA.brew.acidity)}
                  b={scoreText(sideB.brew.acidity)}
                />
                <CompareRow
                  label="甜感"
                  a={scoreText(sideA.brew.sweetness)}
                  b={scoreText(sideB.brew.sweetness)}
                />
                <CompareRow
                  label="苦味"
                  a={scoreText(sideA.brew.bitterness)}
                  b={scoreText(sideB.brew.bitterness)}
                />
                <CompareRow
                  label="口感"
                  a={scoreText(sideA.brew.body)}
                  b={scoreText(sideB.brew.body)}
                />
                <CompareRow
                  label="平衡感"
                  a={scoreText(sideA.brew.balance)}
                  b={scoreText(sideB.brew.balance)}
                />
                <CompareRow
                  label="餘韻"
                  a={scoreText(sideA.brew.aftertaste)}
                  b={scoreText(sideB.brew.aftertaste)}
                />
                <CompareRow
                  label="整體"
                  a={scoreText(sideA.brew.overall)}
                  b={scoreText(sideB.brew.overall)}
                />
                <CompareRow
                  label="風味標籤"
                  a={sideA.tags.length > 0 ? sideA.tags.join('、') : null}
                  b={sideB.tags.length > 0 ? sideB.tags.join('、') : null}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
