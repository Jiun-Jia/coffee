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
import { DeleteBeanDialog } from '@/components/beans/delete-bean-dialog'
import { RestDaysChart } from '@/components/charts/rest-days-chart'
import { getCurrentProfile } from '@/lib/auth/profile'
import { formatRatio, formatSecondsToMSS } from '@/lib/format'
import { getBean, getBeanBrews } from '@/lib/queries/beans'
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

  const brews = await getBeanBrews(id)
  // A1：標記最佳（overall 最高，同分取最新；列表已按 brewed_at desc 排序）
  const best = brews.reduce<(typeof brews)[number] | null>(
    (acc, b) =>
      acc === null || (b.overall ?? 0) > (acc.overall ?? 0) ? b : acc,
    null,
  )

  const meta = [
    { label: '產地', value: bean.origin },
    { label: '品種', value: bean.varietal },
    { label: '處理法', value: bean.process },
    { label: '海拔', value: bean.altitude },
    { label: '莊園 / 處理廠', value: bean.farm },
    { label: '烘焙日期', value: bean.roast_date },
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
          </div>
          <p className="text-muted-foreground text-sm">{bean.roaster}</p>
        </div>
        {isCreator && (
          <div className="flex gap-2">
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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">
            這包豆的沖煮（{brews.length} 筆）
          </h2>
          <Button asChild size="sm">
            <Link href={`/brews/new?beanId=${bean.id}`}>
              <Plus className="size-4" />
              用這包沖煮
            </Link>
          </Button>
        </div>

        {brews.filter((b) => b.rest_days != null && b.overall != null)
          .length >= 2 && (
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
