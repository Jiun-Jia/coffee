import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDown, ArrowUp, CupSoda, Plus } from 'lucide-react'
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
import { BrewFilters } from '@/components/brews/brew-filters'
import { BrewsTabs } from '@/components/brews/brews-tabs'
import Image from 'next/image'
import { toBrewFilters, type BrewSearchParams } from '@/lib/brew-filters'
import { formatRatio } from '@/lib/format'
import { listBeans } from '@/lib/queries/beans'
import { listBrews, listDistinctDrippers } from '@/lib/queries/brews'
import { getPhotoUrls } from '@/lib/queries/photos'
import { listFlavorTags } from '@/lib/queries/tags'
import { ROAST_LEVEL_LABELS } from '@/lib/validations/enums'

export const metadata: Metadata = { title: '沖煮紀錄' }

type SearchParams = BrewSearchParams

function stars(overall: number | null) {
  const n = overall ?? 0
  return (
    <>
      {'★'.repeat(n)}
      <span className="text-muted-foreground">{'★'.repeat(5 - n)}</span>
    </>
  )
}

/** 欄頭排序連結：同欄再點切換方向（FR-7.2） */
function SortHeader({
  label,
  column,
  sp,
}: {
  label: string
  column: 'brewed_at' | 'overall'
  sp: SearchParams
}) {
  const active = (sp.sort ?? 'brewed_at') === column
  const dir = active && sp.dir !== 'asc' ? 'asc' : 'desc'
  const params = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v) as [string, string][],
  )
  params.set('sort', column)
  params.set('dir', active ? dir : 'desc')
  return (
    <Link
      href={`/brews?${params.toString()}`}
      className="inline-flex items-center gap-1 hover:underline"
    >
      {label}
      {active &&
        (sp.dir === 'asc' ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        ))}
    </Link>
  )
}

export default async function BrewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const filters = toBrewFilters(sp)

  const [brews, beans, drippers, tags] = await Promise.all([
    listBrews(filters),
    listBeans(),
    listDistinctDrippers(),
    listFlavorTags(),
  ])
  // PHOTO-3 列表縮圖：只為有成品照的列批次簽名
  const photoUrls = await getPhotoUrls(brews.map((b) => b.photo_path ?? null))
  const thumb = (path: string | null | undefined) =>
    path ? (photoUrls.get(path) ?? null) : null

  const distinct = (values: (string | null)[]) =>
    [...new Set(values.filter(Boolean))] as string[]

  const filterOptions = {
    beans: beans.map((b) => ({ id: b.id, label: b.name_batch })),
    origins: distinct(beans.map((b) => b.origin)),
    processes: distinct(beans.map((b) => b.process)),
    roasters: distinct(beans.map((b) => b.roaster)),
    drippers,
    tags: tags.map((t) => ({ id: t.id, name: t.name })),
  }

  const hasAnyFilter = Object.entries(sp).some(
    ([k, v]) => v && k !== 'sort' && k !== 'dir',
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">沖煮紀錄</h1>
        <Button asChild>
          <Link href="/brews/new">
            <Plus className="size-4" />
            新增沖煮
          </Link>
        </Button>
      </div>

      <BrewsTabs active="brews" />

      <BrewFilters options={filterOptions} />

      {brews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CupSoda className="text-muted-foreground size-10" />
            <p className="text-muted-foreground text-sm">
              {hasAnyFilter
                ? '沒有符合篩選條件的紀錄。'
                : '還沒有沖煮紀錄。沖一杯，記下來吧。'}
            </p>
            {!hasAnyFilter && (
              <Button asChild variant="outline">
                <Link href="/brews/new">
                  <Plus className="size-4" />
                  記錄第一杯
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">共 {brews.length} 筆</p>
          {/* 桌面：表格 */}
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortHeader label="日期" column="brewed_at" sp={sp} />
                  </TableHead>
                  <TableHead>豆子</TableHead>
                  <TableHead>焙度</TableHead>
                  <TableHead className="text-right">水溫</TableHead>
                  <TableHead className="text-right">粉水比</TableHead>
                  <TableHead className="text-right">養豆</TableHead>
                  <TableHead className="text-right">
                    <SortHeader label="喜好度" column="overall" sp={sp} />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brews.map((brew) => (
                  <TableRow key={brew.id}>
                    <TableCell>
                      <Link
                        href={`/brews/${brew.id}`}
                        className="hover:underline"
                      >
                        {brew.brewed_at?.slice(0, 10)}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {thumb(brew.photo_path) && (
                          <Image
                            src={thumb(brew.photo_path)!}
                            alt=""
                            width={32}
                            height={32}
                            unoptimized
                            className="size-8 shrink-0 rounded object-cover"
                          />
                        )}
                        <span className="min-w-0">
                          {brew.name_batch}
                          <span className="text-muted-foreground ml-1 text-xs">
                            {brew.roaster}
                            {brew.group_id && brew.brewer_username && (
                              <> · {brew.brewer_username}</>
                            )}
                          </span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {brew.roast_level && (
                        <Badge variant="secondary">
                          {ROAST_LEVEL_LABELS[brew.roast_level]}
                        </Badge>
                      )}
                    </TableCell>
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
                      {stars(brew.overall)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 手機：卡片 */}
          <div className="grid gap-3 md:hidden">
            {brews.map((brew) => (
              <Link key={brew.id} href={`/brews/${brew.id}`}>
                <Card>
                  <CardContent className="space-y-1 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        {thumb(brew.photo_path) && (
                          <Image
                            src={thumb(brew.photo_path)!}
                            alt=""
                            width={36}
                            height={36}
                            unoptimized
                            className="size-9 shrink-0 rounded object-cover"
                          />
                        )}
                        <span className="min-w-0 truncate">
                          {brew.name_batch}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm">
                        {stars(brew.overall)}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {brew.group_id && brew.brewer_username && (
                        <>{brew.brewer_username} · </>
                      )}
                      {brew.brewed_at?.slice(0, 10)} ·{' '}
                      {brew.water_temp != null ? `${brew.water_temp}°C · ` : ''}
                      {brew.ratio_value != null
                        ? formatRatio(brew.ratio_value)
                        : ''}
                      {brew.rest_days != null
                        ? ` · 養豆 ${brew.rest_days} 天`
                        : ''}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
