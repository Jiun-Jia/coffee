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
import { beanInventory } from '@/lib/bean-inventory'
import { calcRestDays } from '@/lib/format'
import { listBeans, type BeanWithCount } from '@/lib/queries/beans'
import { ROAST_LEVEL_LABELS } from '@/lib/validations/enums'

export const metadata: Metadata = { title: '豆子' }

/** 養豆天數顯示（D10：允許未來烘焙日 → 顯示「尚未烘焙」） */
function restDaysLabel(roastDate: string): string {
  const days = calcRestDays(new Date(), roastDate)
  if (days === null) return '—'
  if (days < 0) return '尚未烘焙'
  return `${days} 天`
}

/** FR-15.2 列表的剩餘量顯示（未填購入重量 → '—'） */
function remainingLabel(bean: BeanWithCount): string {
  const inv = beanInventory(
    bean.purchase_weight_g,
    bean.total_dose_g,
    bean.avg_dose_g,
  )
  if (!inv) return '—'
  return `${Math.max(0, inv.remainingG)} g`
}

export default async function BeansPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>
}) {
  const [{ archived }, allBeans] = await Promise.all([
    searchParams,
    listBeans(),
  ])

  // FR-15.3：列表預設隱藏封存豆，可切換顯示
  const showArchived = archived === '1'
  const archivedCount = allBeans.filter((b) => b.archived_at !== null).length
  const beans = showArchived
    ? allBeans
    : allBeans.filter((b) => b.archived_at === null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">豆子</h1>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href={showArchived ? '/beans' : '/beans?archived=1'}>
                {showArchived ? '隱藏已封存' : `含已封存（${archivedCount}）`}
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/beans/new">
              <Plus className="size-4" />
              新增豆子
            </Link>
          </Button>
        </div>
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
                  <TableHead className="text-right">剩餘</TableHead>
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
                      {bean.group_name && (
                        <Badge variant="outline" className="ml-2">
                          {bean.group_name}
                        </Badge>
                      )}
                      {bean.archived_at && (
                        <Badge variant="outline" className="ml-2">
                          已封存
                        </Badge>
                      )}
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
                      {remainingLabel(bean)}
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
                      <span className="font-medium">
                        {bean.name_batch}
                        {bean.group_name && (
                          <Badge variant="outline" className="ml-1.5">
                            {bean.group_name}
                          </Badge>
                        )}
                        {bean.archived_at && (
                          <Badge variant="outline" className="ml-1.5">
                            已封存
                          </Badge>
                        )}
                      </span>
                      <Badge variant="secondary">
                        {ROAST_LEVEL_LABELS[bean.roast_level]}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {bean.roaster} · {bean.origin}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      養豆 {restDaysLabel(bean.roast_date)} · {bean.brew_count}{' '}
                      筆沖煮
                      {remainingLabel(bean) !== '—' &&
                        ` · 剩 ${remainingLabel(bean)}`}
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
