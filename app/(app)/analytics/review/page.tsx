import type { Metadata } from 'next'
import Link from 'next/link'
import { Coffee, CupSoda, Scale, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AnalyticsTabs } from '@/components/analytics/analytics-tabs'
import { OverallTrendChart } from '@/components/charts/overall-trend'
import { getCurrentProfile } from '@/lib/auth/profile'
import { fetchReviewStats, type ReviewPeriod } from '@/lib/queries/review'

export const metadata: Metadata = { title: '回顧' }

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between py-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <Icon className="text-muted-foreground size-5" />
      </CardContent>
    </Card>
  )
}

/** FR-20 沖煮回顧（RVW-1）：月/年統計，適合截圖分享。 */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const [{ period: periodParam }, profile] = await Promise.all([
    searchParams,
    getCurrentProfile(),
  ])
  const period: ReviewPeriod = periodParam === 'year' ? 'year' : 'month'
  const stats = await fetchReviewStats(profile?.id ?? '', period)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">分析</h1>
        <div className="flex gap-1">
          <Button
            asChild
            size="sm"
            variant={period === 'month' ? 'secondary' : 'ghost'}
          >
            <Link href="/analytics/review">本月</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant={period === 'year' ? 'secondary' : 'ghost'}
          >
            <Link href="/analytics/review?period=year">今年</Link>
          </Button>
        </div>
      </div>

      <AnalyticsTabs active="review" />

      <p className="text-muted-foreground text-sm">
        {stats.periodLabel} 的手沖足跡（只計自己的沖煮）
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="總杯數"
          value={`${stats.cupCount} 杯`}
          icon={CupSoda}
        />
        <StatTile
          label="總用豆量"
          value={`${stats.totalDoseG} g`}
          icon={Scale}
        />
        <StatTile
          label="喝過的豆子"
          value={`${stats.beanCount} 包`}
          icon={Coffee}
        />
        <StatTile
          label="平均喜好度"
          value={stats.avgOverall != null ? `★${stats.avgOverall}` : '—'}
          icon={Star}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">喜好度走勢</CardTitle>
          <CardDescription>
            {period === 'month' ? '逐日' : '逐月'}平均整體喜好度
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OverallTrendChart points={stats.trend} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">風味偏好</CardTitle>
            <CardDescription>
              本期前 5 標籤（括號為 vs {stats.prevLabel}的次數變化）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {stats.tags.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">
                這段期間還沒有掛標籤的沖煮
              </p>
            )}
            {stats.tags.map((tag) => (
              <div
                key={tag.name}
                className="flex items-baseline justify-between text-sm"
              >
                <span className="font-medium">{tag.name}</span>
                <span className="text-muted-foreground">
                  {tag.count} 次（
                  {tag.delta > 0 ? `+${tag.delta}` : tag.delta}）· ★
                  {tag.avgOverall}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">本期最佳一杯</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.best ? (
              <Link
                href={`/brews/${stats.best.id}`}
                className="hover:bg-accent/50 flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors"
              >
                <span className="min-w-0 truncate font-medium">
                  {stats.best.label}
                </span>
                <span className="shrink-0">
                  {'★'.repeat(stats.best.overall)}
                </span>
              </Link>
            ) : (
              <p className="text-muted-foreground py-4 text-center text-sm">
                這段期間還沒有評分的沖煮
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
