import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArchiveBeanButton } from '@/components/beans/archive-bean-button'
import { DeleteBeanDialog } from '@/components/beans/delete-bean-dialog'
import { RestDaysChart } from '@/components/charts/rest-days-chart'
import { PhotoUploader } from '@/components/shared/photo-uploader'
import { ShareToggle } from '@/components/shared/share-toggle'
import { getCurrentProfile } from '@/lib/auth/profile'
import { beanInsights } from '@/lib/bean-insights'
import { beanInventory } from '@/lib/bean-inventory'
import { drinkingWindow, inWindow } from '@/lib/drinking-window'
import { calcRestDays, formatRatio, formatSecondsToMSS } from '@/lib/format'
import { getBean, getBeanBrews } from '@/lib/queries/beans'
import { listGrinders } from '@/lib/queries/grinders'
import { getPhotoUrl } from '@/lib/queries/photos'
import { ROAST_LEVEL_LABELS } from '@/lib/validations/enums'

export const metadata: Metadata = { title: '豆子詳情' }

export default async function BeanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [bean, profile] = await Promise.all([getBean(id), getCurrentProfile()])
  if (!bean) notFound()
  // FR-10.3：群組豆的編輯/刪除僅限建立者；群組豆的沖煮表顯示沖煮人
  const isCreator = bean.user_id === profile?.id
  const isGroupBean = bean.group_id !== null

  const [brews, photoUrl, grinders] = await Promise.all([
    getBeanBrews(id),
    getPhotoUrl(bean.photo_path),
    listGrinders(),
  ])
  // A1：標記最佳（overall 最高，同分取最新；列表已按 brewed_at desc 排序）
  const best = brews.reduce<(typeof brews)[number] | null>(
    (acc, b) =>
      acc === null || (b.overall ?? 0) > (acc.overall ?? 0) ? b : acc,
    null,
  )

  // FR-15.2 庫存（未填購入重量 → null 不顯示）
  const inventory = beanInventory(
    bean.purchase_weight_g,
    bean.total_dose_g,
    bean.avg_dose_g,
  )
  const archived = bean.archived_at !== null

  // FR-16 適飲區間（個人化以「我的」有評分沖煮計）
  const window = drinkingWindow(
    brews
      .filter(
        (b) =>
          b.user_id === profile?.id && b.rest_days != null && b.overall != null,
      )
      .map((b) => ({ restDays: b.rest_days!, overall: b.overall! })),
    bean.roast_level,
  )
  const todayRestDays = calcRestDays(new Date(), bean.roast_date)
  const drinkableNow =
    !archived && todayRestDays != null && inWindow(todayRestDays, window)

  // FR-19 觀察（INS-2）：以「我的」有評分沖煮做規則式比較
  const grinderName = new Map(grinders.map((g) => [g.id, g.name]))
  const insights = beanInsights(
    brews
      .filter((b) => b.user_id === profile?.id && b.overall != null)
      .map((b) => ({
        waterTemp: b.water_temp,
        ratioValue: b.ratio_value,
        grinderId: b.grinder_id,
        grinderName: b.grinder_id
          ? (grinderName.get(b.grinder_id) ?? null)
          : null,
        grindSetting: b.grind_setting,
        overall: b.overall!,
      })),
  )

  const meta = [
    { label: '產地', value: bean.origin },
    { label: '品種', value: bean.varietal },
    { label: '處理法', value: bean.process },
    { label: '海拔', value: bean.altitude },
    { label: '莊園 / 處理廠', value: bean.farm },
    { label: '烘焙日期', value: bean.roast_date },
    {
      label: '購入重量',
      value:
        bean.purchase_weight_g != null ? `${bean.purchase_weight_g} g` : null,
    },
    { label: '價格', value: bean.price != null ? `NT$ ${bean.price}` : null },
    {
      label: '剩餘',
      value: inventory
        ? `約 ${Math.max(0, inventory.remainingG)} g${
            inventory.estCupsLeft != null
              ? `（還能沖約 ${inventory.estCupsLeft} 杯）`
              : ''
          }`
        : null,
    },
    {
      label: '適飲區間',
      value: `第 ${window.fromDay}–${window.toDay} 天（${
        window.source === 'personal' ? '依你的紀錄' : '焙度預設'
      }）${drinkableNow ? ` · 今天第 ${todayRestDays} 天，正值適飲` : ''}`,
    },
  ].filter((m) => m.value)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{bean.name_batch}</h1>
            <Badge variant="secondary">
              {ROAST_LEVEL_LABELS[bean.roast_level]}
            </Badge>
            {bean.group_name && (
              <Badge variant="outline">{bean.group_name}</Badge>
            )}
            {archived && <Badge variant="outline">已封存</Badge>}
          </div>
          <p className="text-muted-foreground text-sm">{bean.roaster}</p>
        </div>
        {isCreator && (
          <div className="flex gap-2">
            <ArchiveBeanButton
              beanId={bean.id}
              beanName={bean.name_batch}
              archived={archived}
            />
            <Button asChild variant="outline" size="sm">
              <Link href={`/beans/${bean.id}/edit`}>
                <Pencil className="size-4" />
                編輯
              </Link>
            </Button>
            <DeleteBeanDialog beanId={bean.id} beanName={bean.name_batch} />
          </div>
        )}
      </div>

      {/* FR-15.4：剩餘 ≤ 0 建議封存（不自動封存）；不足一杯先提醒 */}
      {!archived && inventory?.lowStock && (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
          {inventory.depleted
            ? '這包豆帳面上已用完——喝完了就封存吧，沖煮下拉會清爽一點（歷史紀錄不受影響）。'
            : '剩餘量已不足一杯，快喝完了。'}
        </p>
      )}

      {/* FR-22 豆袋照（建立者可上傳/替換/刪除；成員可看） */}
      <PhotoUploader
        kind="bean"
        id={bean.id}
        userId={profile?.id ?? ''}
        photoUrl={photoUrl}
        photoPath={bean.photo_path}
        canEdit={isCreator}
        label="豆袋照"
      />

      <Card>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 py-4 text-sm sm:grid-cols-3">
          {meta.map((m) => (
            <div key={m.label}>
              <span className="text-muted-foreground">{m.label}：</span>
              {m.value}
            </div>
          ))}
          {bean.notes && (
            <div className="col-span-full">
              <span className="text-muted-foreground">備註：</span>
              {bean.notes}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FR-9 公開分享（豆子頁僅建立者可開；公開頁只列建立者自己的沖煮） */}
      {isCreator && (
        <ShareToggle kind="bean" id={bean.id} slug={bean.public_slug} />
      )}

      {/* FR-19 觀察（INS-2）：規則式的變因比較，樣本門檻見 lib/bean-insights */}
      {insights.length > 0 && (
        <Card>
          <CardContent className="space-y-1.5 py-4">
            <p className="text-sm font-medium">觀察</p>
            {insights.map((insight) => (
              <p key={insight.text} className="text-sm">
                {insight.text}
              </p>
            ))}
            <p className="text-muted-foreground text-xs">
              依你的紀錄做規則式統計（兩側樣本 ≥ 3 且差 ≥ 0.5
              分才顯示），僅供調整參考
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">
            這包豆的沖煮（{brews.length} 筆）
          </h2>
          {!archived && (
            <Button asChild size="sm">
              <Link href={`/brews/new?beanId=${bean.id}`}>
                <Plus className="size-4" />
                用這包沖煮
              </Link>
            </Button>
          )}
        </div>

        {brews.filter((b) => b.rest_days != null && b.overall != null).length >=
          2 && (
          <Card>
            <CardContent className="pt-4">
              <RestDaysChart
                height={200}
                points={brews
                  .filter((b) => b.rest_days != null && b.overall != null)
                  .map((b) => ({
                    rest_days: b.rest_days as number,
                    overall: b.overall as number,
                  }))}
              />
            </CardContent>
          </Card>
        )}

        {brews.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            還沒有用這包豆子的沖煮紀錄。
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  {isGroupBean && <TableHead>沖煮人</TableHead>}
                  <TableHead>刻度</TableHead>
                  <TableHead className="text-right">水溫</TableHead>
                  <TableHead className="text-right">粉水比</TableHead>
                  <TableHead className="text-right">養豆</TableHead>
                  <TableHead className="text-right">總時間</TableHead>
                  <TableHead className="text-right">喜好度</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brews.map((brew) => (
                  <TableRow
                    key={brew.id}
                    className={
                      best && brew.id === best.id ? 'bg-primary/5' : undefined
                    }
                  >
                    <TableCell>
                      <Link
                        href={`/brews/${brew.id}`}
                        className="hover:underline"
                      >
                        {brew.brewed_at?.slice(0, 10)}
                      </Link>
                      {best && brew.id === best.id && (
                        <Badge className="ml-2" variant="secondary">
                          最佳
                        </Badge>
                      )}
                    </TableCell>
                    {isGroupBean && (
                      <TableCell>{brew.brewer_username ?? '—'}</TableCell>
                    )}
                    <TableCell>{brew.grind_setting ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {brew.water_temp != null ? `${brew.water_temp}°C` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {brew.ratio_value != null
                        ? formatRatio(brew.ratio_value)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {brew.rest_days != null ? `${brew.rest_days} 天` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {brew.total_time_sec != null
                        ? formatSecondsToMSS(brew.total_time_sec)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {'★'.repeat(brew.overall ?? 0)}
                      <span className="text-muted-foreground">
                        {'★'.repeat(Math.max(0, 5 - (brew.overall ?? 0)))}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
