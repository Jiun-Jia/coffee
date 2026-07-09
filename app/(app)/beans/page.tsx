import type { Metadata } from 'next'
import Link from 'next/link'
import { Coffee, Plus } from 'lucide-react'
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
import { calcRestDays } from '@/lib/format'
import { listBeans } from '@/lib/queries/beans'
import { ROAST_LEVEL_LABELS } from '@/lib/validations/enums'

export const metadata: Metadata = { title: '豆子' }

/** 養豆天數顯示（D10：允許未來烘焙日 → 顯示「尚未烘焙」） */
function restDaysLabel(roastDate: string): string {
  const days = calcRestDays(new Date(), roastDate)
  if (days === null) return '—'
  if (days < 0) return '尚未烘焙'
  return `${days} 天`
}

export default async function BeansPage() {
  const beans = await listBeans()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">豆子</h1>
        <Button asChild>
          <Link href="/beans/new">
            <Plus className="size-4" />
            新增豆子
          </Link>
        </Button>
      </div>

      {beans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Coffee className="text-muted-foreground size-10" />
            <p className="text-muted-foreground text-sm">
              還沒有豆子。先新增一包，就能開始記錄沖煮了。
            </p>
            <Button asChild variant="outline">
              <Link href="/beans/new">
                <Plus className="size-4" />
                新增第一包豆子
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
                  <TableHead>豆名 / 批次</TableHead>
                  <TableHead>烘豆店家</TableHead>
                  <TableHead>產地</TableHead>
                  <TableHead>焙度</TableHead>
                  <TableHead>烘焙日期</TableHead>
                  <TableHead className="text-right">養豆</TableHead>
                  <TableHead className="text-right">沖煮</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beans.map((bean) => (
                  <TableRow key={bean.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/beans/${bean.id}`}
                        className="hover:underline"
                      >
                        {bean.name_batch}
                      </Link>
                    </TableCell>
                    <TableCell>{bean.roaster}</TableCell>
                    <TableCell>{bean.origin}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ROAST_LEVEL_LABELS[bean.roast_level]}
                      </Badge>
                    </TableCell>
                    <TableCell>{bean.roast_date}</TableCell>
                    <TableCell className="text-right">
                      {restDaysLabel(bean.roast_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      {bean.brew_count} 筆
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 手機：卡片 */}
          <div className="grid gap-3 md:hidden">
            {beans.map((bean) => (
              <Link key={bean.id} href={`/beans/${bean.id}`}>
                <Card>
                  <CardContent className="space-y-1 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{bean.name_batch}</span>
                      <Badge variant="secondary">
                        {ROAST_LEVEL_LABELS[bean.roast_level]}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {bean.roaster} · {bean.origin}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      養豆 {restDaysLabel(bean.roast_date)} ·{' '}
                      {bean.brew_count} 筆沖煮
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
