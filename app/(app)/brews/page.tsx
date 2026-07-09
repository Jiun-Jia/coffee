import type { Metadata } from 'next'
import Link from 'next/link'
import { CupSoda, Plus } from 'lucide-react'
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
import { formatRatio } from '@/lib/format'
import { listBrews } from '@/lib/queries/brews'
import { ROAST_LEVEL_LABELS } from '@/lib/validations/enums'

export const metadata: Metadata = { title: '沖煮紀錄' }

function stars(overall: number | null) {
  const n = overall ?? 0
  return (
    <>
      {'★'.repeat(n)}
      <span className="text-muted-foreground">{'★'.repeat(5 - n)}</span>
    </>
  )
}

// P3 基本版（W4 的 BREW-13 補完整篩選/排序/搜尋）
export default async function BrewsPage() {
  const brews = await listBrews()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">沖煮紀錄</h1>
        <Button asChild>
          <Link href="/brews/new">
            <Plus className="size-4" />
            新增沖煮
          </Link>
        </Button>
      </div>

      {brews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CupSoda className="text-muted-foreground size-10" />
            <p className="text-muted-foreground text-sm">
              還沒有沖煮紀錄。沖一杯，記下來吧。
            </p>
            <Button asChild variant="outline">
              <Link href="/brews/new">
                <Plus className="size-4" />
                記錄第一杯
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 桌面：表格 */}
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>豆子</TableHead>
                  <TableHead>焙度</TableHead>
                  <TableHead className="text-right">水溫</TableHead>
                  <TableHead className="text-right">粉水比</TableHead>
                  <TableHead className="text-right">養豆</TableHead>
                  <TableHead className="text-right">喜好度</TableHead>
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
