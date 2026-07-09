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
import { formatRatio } from '@/lib/format'
import { listBeans } from '@/lib/queries/beans'
import {
  listBrews,
  listDistinctDrippers,
  type BrewFilters as Filters,
} from '@/lib/queries/brews'
import { listFlavorTags } from '@/lib/queries/tags'
import {
  ROAST_LEVELS,
  ROAST_LEVEL_LABELS,
  type RoastLevel,
} from '@/lib/validations/enums'

export const metadata: Metadata = { title: '沖煮紀錄' }

type SearchParams = {
  q?: string
  bean?: string
  roast?: string
  origin?: string
  process?: string
  roaster?: string
  dripper?: string
  tag?: string
  minOverall?: string
  from?: string
  to?: string
  sort?: string
  dir?: string
}

function toFilters(sp: SearchParams): Filters {
  const minOverall = Number(sp.minOverall)
  return {
    q: sp.q || undefined,
    beanId: sp.bean || undefined,
    roastLevel: ROAST_LEVELS.includes(sp.roast as RoastLevel)
      ? (sp.roast as RoastLevel)
      : undefined,
    origin: sp.origin || undefined,
    process: sp.process || undefined,
    roaster: sp.roaster || undefined,
    dripper: sp.dripper || undefined,
    tagId: sp.tag || undefined,
    minOverall:
      Number.isInteger(minOverall) && minOverall >= 1 && minOverall <= 5
        ? minOverall
        : undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
    sort: sp.sort === 'overall' ? 'overall' : 'brewed_at',
    dir: sp.dir === 'asc' ? 'asc' : 'desc',
  }
}

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
    <Link href={`/brews?${params.toString()}`} className="inline-flex items-center gap-1 hover:underline">
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
  const filters = toFilters(sp)

  const [brews, beans, drippers, tags] = await Promise.all([
    listBrews(filters),
    listBeans(),
    listDistinctDrippers(),
    listFlavorTags(),
  ])

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
          <p className="text-muted-foreground text-sm">
            共 {brews.length} 筆
          </p>
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
                      {brew.name_batch}
                      <span className="text-muted-foreground ml-1 text-xs">
                        {brew.roaster}
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
                      <span className="font-medium">{brew.name_batch}</span>
                      <span className="text-sm">{stars(brew.overall)}</span>
                    </div>
                    <p className="text-muted-foreground text-sm">
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
