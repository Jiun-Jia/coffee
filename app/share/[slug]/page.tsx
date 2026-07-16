import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { ImageDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  calcRatioValue,
  calcRestDays,
  formatRatio,
  formatSecondsToMSS,
} from '@/lib/format'
import { getPhotoUrl } from '@/lib/queries/photos'
import {
  fetchShared,
  type BeanShared,
  type BrewShared,
} from '@/lib/queries/share'
import { BREW_TYPE_LABELS, ROAST_LEVEL_LABELS } from '@/lib/validations/enums'

/**
 * FR-9 公開分享頁（SHARE-2）：無需登入的唯讀「配方卡」。
 * 資料層與欄位白名單見 lib/queries/share.ts；
 * 配方卡圖片（FR-9.4）由同層 opengraph-image.tsx 產生，
 * 「下載配方卡」按鈕直接連到該圖。noindex：不進搜尋引擎。
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const shared = await fetchShared(slug)
  const title =
    shared?.type === 'brew'
      ? `${shared.brew.beans?.name_batch ?? '沖煮'} 配方卡 | Brewlog`
      : shared?.type === 'bean'
        ? `${shared.bean.name_batch} | Brewlog`
        : 'Brewlog 分享'
  return {
    title,
    robots: { index: false, follow: false },
    openGraph: { title, description: '手沖咖啡沖煮紀錄分享（唯讀）' },
  }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <span className="text-muted-foreground">{label}：</span>
      {value}
    </div>
  )
}

function stars(n: number | null) {
  return n != null ? `${'★'.repeat(n)}${'☆'.repeat(Math.max(0, 5 - n))}` : null
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const shared = await fetchShared(slug)
  if (!shared) notFound()

  const photoUrl = await getPhotoUrl(
    shared.type === 'brew' ? shared.brew.photo_path : shared.bean.photo_path,
  )

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 py-8">
      <header className="flex items-center justify-between">
        <span className="text-lg font-semibold">☕ Brewlog</span>
        <span className="flex items-center gap-2">
          {/* FR-9.4 配方卡圖片：og-image 同源，可直接下載貼社群 */}
          <a
            href={`/share/${slug}/opengraph-image`}
            download="brewlog-card.png"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            <ImageDown className="size-4" />
            下載配方卡
          </a>
          <Badge variant="outline">唯讀分享</Badge>
        </span>
      </header>

      {shared.type === 'brew' ? (
        <BrewCard
          brew={shared.brew}
          pours={shared.pours}
          tags={shared.tags}
          photoUrl={photoUrl}
        />
      ) : (
        <BeanCard bean={shared.bean} brews={shared.brews} photoUrl={photoUrl} />
      )}

      <footer className="text-muted-foreground pt-4 text-center text-xs">
        以 Brewlog 記錄的手沖咖啡（此頁由擁有者主動分享，可隨時撤回）
      </footer>
    </main>
  )
}

function BrewCard({
  brew,
  pours,
  tags,
  photoUrl,
}: {
  brew: BrewShared['brew']
  pours: BrewShared['pours']
  tags: string[]
  photoUrl: string | null
}) {
  const bean = brew.beans
  const restDays = bean
    ? calcRestDays(new Date(brew.brewed_at), bean.roast_date)
    : null
  const ratio =
    brew.dose_g != null && brew.water_g != null
      ? calcRatioValue(
          brew.water_g,
          brew.dose_g,
          brew.ice_g,
          brew.ratio_include_ice,
        )
      : null

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">
          {bean?.name_batch ?? '手沖紀錄'}
          <Badge variant="outline" className="ml-2 align-middle">
            {BREW_TYPE_LABELS[brew.brew_type]}
          </Badge>
        </h1>
        <p className="text-muted-foreground text-sm">
          {bean && (
            <>
              {bean.roaster} · {bean.origin} ·{' '}
              {ROAST_LEVEL_LABELS[bean.roast_level]}
            </>
          )}
          {restDays != null && restDays >= 0 && <> · 養豆 {restDays} 天</>}
          {brew.profiles?.username && <> · 沖煮人 {brew.profiles.username}</>}
        </p>
        <p className="text-muted-foreground text-sm">
          {brew.brewed_at.slice(0, 10)}
        </p>
      </div>

      {photoUrl && (
        <Image
          src={photoUrl}
          alt="成品照"
          width={640}
          height={480}
          unoptimized
          className="max-h-80 w-auto rounded-md border object-contain"
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">沖煮參數</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <Row label="濾杯" value={brew.dripper} />
          <Row label="濾紙" value={brew.filter} />
          <Row label="磨豆機" value={brew.grinders?.name} />
          <Row label="刻度" value={brew.grind_setting} />
          <Row label="手沖壺" value={brew.kettle} />
          <Row
            label="水溫"
            value={brew.water_temp != null ? `${brew.water_temp}°C` : null}
          />
          <Row label="粉量" value={`${brew.dose_g} g`} />
          <Row label="水量" value={`${brew.water_g} g`} />
          <Row
            label="冰量"
            value={brew.ice_g != null ? `${brew.ice_g} g` : null}
          />
          <Row
            label="水粉比"
            value={ratio != null ? formatRatio(ratio) : null}
          />
          <Row
            label="悶蒸水量"
            value={
              brew.bloom_water_g != null ? `${brew.bloom_water_g} g` : null
            }
          />
          <Row
            label="悶蒸時間"
            value={
              brew.bloom_time_sec != null
                ? formatSecondsToMSS(brew.bloom_time_sec)
                : null
            }
          />
          <Row
            label="總時間"
            value={
              brew.total_time_sec != null
                ? formatSecondsToMSS(brew.total_time_sec)
                : null
            }
          />
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">感官評分</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <Row label="香氣" value={stars(brew.aroma)} />
          <Row label="酸質" value={stars(brew.acidity)} />
          <Row label="甜感" value={stars(brew.sweetness)} />
          <Row label="苦味" value={stars(brew.bitterness)} />
          <Row label="口感" value={stars(brew.body)} />
          <Row label="平衡感" value={stars(brew.balance)} />
          <Row label="餘韻" value={stars(brew.aftertaste)} />
          <Row label="整體喜好度" value={stars(brew.overall)} />
        </CardContent>
      </Card>

      {(tags.length > 0 || brew.flavor_notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">風味</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
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
    </div>
  )
}

function BeanCard({
  bean,
  brews,
  photoUrl,
}: {
  bean: BeanShared['bean']
  brews: BeanShared['brews']
  photoUrl: string | null
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">
          {bean.name_batch}
          <Badge variant="secondary" className="ml-2 align-middle">
            {ROAST_LEVEL_LABELS[bean.roast_level]}
          </Badge>
        </h1>
        <p className="text-muted-foreground text-sm">
          {bean.roaster}
          {bean.profiles?.username && <> · 分享者 {bean.profiles.username}</>}
        </p>
      </div>

      {photoUrl && (
        <Image
          src={photoUrl}
          alt="豆袋照"
          width={640}
          height={480}
          unoptimized
          className="max-h-80 w-auto rounded-md border object-contain"
        />
      )}

      <Card>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 py-4 text-sm sm:grid-cols-3">
          <Row label="產地" value={bean.origin} />
          <Row label="品種" value={bean.varietal} />
          <Row label="處理法" value={bean.process} />
          <Row label="海拔" value={bean.altitude} />
          <Row label="莊園 / 處理廠" value={bean.farm} />
          <Row label="烘焙日期" value={bean.roast_date} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            分享者的沖煮（{brews.length} 筆）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {brews.length === 0 && (
            <p className="text-muted-foreground">還沒有沖煮紀錄。</p>
          )}
          {brews.map((brew) => {
            const ratio =
              brew.dose_g != null && brew.water_g != null
                ? calcRatioValue(
                    brew.water_g,
                    brew.dose_g,
                    brew.ice_g,
                    brew.ratio_include_ice,
                  )
                : null
            const restDays = calcRestDays(
              new Date(brew.brewed_at),
              bean.roast_date,
            )
            const summary = (
              <span className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate">
                  <span className="text-muted-foreground">
                    {brew.brewed_at.slice(0, 10)}
                  </span>{' '}
                  {brew.water_temp != null && `${brew.water_temp}°C `}
                  {ratio != null && `${formatRatio(ratio)} `}
                  {restDays != null && restDays >= 0 && `養豆${restDays}天`}
                </span>
                <span className="shrink-0">{stars(brew.overall)}</span>
              </span>
            )
            // 該筆沖煮也有公開 → 連到它的配方卡
            return brew.public_slug ? (
              <Link
                key={brew.id}
                href={`/share/${brew.public_slug}`}
                className="hover:bg-accent/50 block rounded-md px-2 py-1.5 transition-colors"
              >
                {summary}
              </Link>
            ) : (
              <div key={brew.id} className="px-2 py-1.5">
                {summary}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
