import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BrewActions } from '@/components/brews/brew-actions'
import { SaveRecipeDialog } from '@/components/brews/save-recipe-dialog'
import { SensoryRadar } from '@/components/charts/sensory-radar'
import { getCurrentProfile } from '@/lib/auth/profile'
import { formatRatio, formatSecondsToMSS } from '@/lib/format'
import { getBrew, getBrewPours, getBrewTags } from '@/lib/queries/brews'
import { BREW_TYPE_LABELS, ROAST_LEVEL_LABELS } from '@/lib/validations/enums'

export const metadata: Metadata = { title: '沖煮詳情' }

function Section({
  title,
  items,
}: {
  title: string
  items: { label: string; value: React.ReactNode }[]
}) {
  const visible = items.filter(
    (i) => i.value !== null && i.value !== undefined && i.value !== '',
  )
  if (visible.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        {visible.map((i) => (
          <div key={i.label}>
            <span className="text-muted-foreground">{i.label}：</span>
            {i.value}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function scoreLabel(n: number | null) {
  return n != null ? `${n} / 5` : null
}

// P4 基本版（W4 的 BREW-14/15/16 補雷達圖、複製、編輯/刪除入口）
export default async function BrewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [brew, profile] = await Promise.all([getBrew(id), getCurrentProfile()])
  if (!brew) notFound()
  const [tags, pours] = await Promise.all([getBrewTags(id), getBrewPours(id)])
  // FR-10.5：他人的紀錄可看不可改（操作列僅本人顯示）
  const isMine = brew.user_id === profile?.id

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">
              {brew.name_batch}
              <span className="text-muted-foreground ml-2 text-base font-normal">
                {brew.brewed_at?.slice(0, 16).replace('T', ' ')}
              </span>
            </h1>
            {brew.brew_type && (
              <Badge variant="outline">
                {BREW_TYPE_LABELS[brew.brew_type]}
              </Badge>
            )}
          </div>
          {brew.id && (
            <div className="flex flex-wrap gap-2">
              {/* FR-14.1：可見的沖煮（含群組成員的）都能存成自己的配方 */}
              <SaveRecipeDialog
                brewId={brew.id}
                suggestedName={brew.name_batch ?? undefined}
              />
              {isMine && <BrewActions brewId={brew.id} />}
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          <Link href={`/beans/${brew.bean_id}`} className="hover:underline">
            {brew.roaster} · {brew.origin}
            {brew.roast_level && ` · ${ROAST_LEVEL_LABELS[brew.roast_level]}`}
          </Link>
          {brew.rest_days != null && ` · 養豆 ${brew.rest_days} 天`}
          {!isMine && brew.brewer_username && (
            <> · 沖煮人：{brew.brewer_username}</>
          )}
        </p>
      </div>

      <Section
        title="沖煮參數"
        items={[
          { label: '濾杯', value: brew.dripper },
          { label: '濾紙', value: brew.filter },
          { label: '刻度', value: brew.grind_setting },
          { label: '手沖壺', value: brew.kettle },
          {
            label: '水溫',
            value: brew.water_temp != null ? `${brew.water_temp}°C` : null,
          },
          {
            label: '粉量',
            value: brew.dose_g != null ? `${brew.dose_g} g` : null,
          },
          {
            label: '水量',
            value: brew.water_g != null ? `${brew.water_g} g` : null,
          },
          {
            label: '冰量',
            value: brew.ice_g != null ? `${brew.ice_g} g` : null,
          },
          {
            label: '水粉比',
            value:
              brew.ratio_value != null
                ? `${formatRatio(brew.ratio_value)}${brew.ratio_include_ice ? '（含冰）' : ''}`
                : null,
          },
          {
            label: '悶蒸水量',
            value:
              brew.bloom_water_g != null ? `${brew.bloom_water_g} g` : null,
          },
          {
            label: '悶蒸時間',
            value:
              brew.bloom_time_sec != null
                ? formatSecondsToMSS(brew.bloom_time_sec)
                : null,
          },
          {
            label: '總時間',
            value:
              brew.total_time_sec != null
                ? formatSecondsToMSS(brew.total_time_sec)
                : null,
          },
        ]}
      />

      {(pours.length > 0 || brew.pour_notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">注水分段</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {pours.length > 0 && (
              <ol className="space-y-1">
                {pours.map((pour) => (
                  <li key={pour.seq} className="flex items-baseline gap-3">
                    <span className="text-muted-foreground shrink-0">
                      第 {pour.seq} 段
                    </span>
                    <span className="font-medium tabular-nums">
                      {pour.end_time_sec != null
                        ? formatSecondsToMSS(pour.end_time_sec)
                        : '—'}
                    </span>
                    <span className="tabular-nums">
                      {pour.cumulative_water_g != null
                        ? `${pour.cumulative_water_g} g`
                        : '—'}
                    </span>
                    {pour.note && (
                      <span className="text-muted-foreground">{pour.note}</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {brew.pour_notes && (
              <p className="whitespace-pre-wrap">{brew.pour_notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {(brew.aroma ?? brew.acidity ?? brew.sweetness ?? brew.body) != null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">感官雷達（A5）</CardTitle>
          </CardHeader>
          <CardContent>
            <SensoryRadar
              height={240}
              series={[
                {
                  id: 'this',
                  label: '本次沖煮',
                  scores: {
                    aroma: brew.aroma,
                    acidity: brew.acidity,
                    sweetness: brew.sweetness,
                    bitterness: brew.bitterness,
                    body: brew.body,
                    balance: brew.balance,
                    aftertaste: brew.aftertaste,
                    overall: brew.overall,
                  },
                },
              ]}
            />
          </CardContent>
        </Card>
      )}

      <Section
        title="感官評分"
        items={[
          { label: '香氣', value: scoreLabel(brew.aroma) },
          { label: '酸質', value: scoreLabel(brew.acidity) },
          { label: '甜感', value: scoreLabel(brew.sweetness) },
          { label: '苦味', value: scoreLabel(brew.bitterness) },
          { label: '口感', value: scoreLabel(brew.body) },
          { label: '平衡感', value: scoreLabel(brew.balance) },
          { label: '餘韻', value: scoreLabel(brew.aftertaste) },
          {
            label: '整體喜好度',
            value: brew.overall != null ? '★'.repeat(brew.overall) : null,
          },
        ]}
      />

      {(tags.length > 0 || brew.flavor_notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">風味</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
            {brew.flavor_notes && (
              <p className="whitespace-pre-wrap">{brew.flavor_notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Section
        title="結論"
        items={[
          { label: '下次調整', value: brew.next_adjustment },
          { label: '備註', value: brew.notes },
        ]}
      />

      {/* W4：BREW-14 雷達圖 / BREW-15 複製為新紀錄 / 編輯與刪除入口 */}
    </div>
  )
}
