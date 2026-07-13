import type { Metadata } from 'next'
import Link from 'next/link'
import { Coffee, CupSoda, Plus, Sprout, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatRatio } from '@/lib/format'
import { getCurrentProfile } from '@/lib/auth/profile'
import { fetchDashboardStats } from '@/lib/queries/dashboard'

export const metadata: Metadata = { title: '首頁' }

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between py-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
          {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
        <Icon className="text-muted-foreground size-5" />
      </CardContent>
    </Card>
  )
}

// P2：統計卡 + 最近沖煮 + 快速新增（VIZ-10/11，指標依 D16）
export default async function DashboardPage() {
  const [profile, stats] = await Promise.all([
    getCurrentProfile(),
    fetchDashboardStats(),
  ])

  const isNewUser = stats.totalBeans === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {profile ? `${profile.username}，來一杯？` : '首頁'}
        </h1>
        <Button asChild>
          <Link href="/brews/new">
            <Plus className="size-4" />
            新增沖煮
          </Link>
        </Button>
      </div>

      {isNewUser ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Coffee className="text-muted-foreground size-10" />
            <p className="font-medium">歡迎使用 Brewlog</p>
            <p className="text-muted-foreground max-w-sm text-sm">
              記錄的第一步是建立一包豆子：店家、豆名、焙度與烘焙日期。
              之後每次沖煮選這包豆，養豆天數與水粉比都會自動計算。
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="本月沖煮"
              value={`${stats.monthCount} 杯`}
              icon={CupSoda}
            />
            <StatTile
              label="本月平均喜好度"
              value={
                stats.monthAvgOverall != null
                  ? `★${stats.monthAvgOverall}`
                  : '—'
              }
              icon={Star}
            />
            <StatTile
              label="最常用豆子"
              value={stats.favoriteBean?.name ?? '—'}
              hint={
                stats.favoriteBean
                  ? `近 90 天 ${stats.favoriteBean.count} 杯`
                  : undefined
              }
              icon={Coffee}
            />
            <StatTile
              label="在養豆子"
              value={`${stats.restingBeans} 包`}
              hint="烘焙日 60 天內"
              icon={Sprout}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">最近沖煮</CardTitle>
              <Link
                href="/brews"
                className="text-muted-foreground text-sm hover:underline"
              >
                查看全部 →
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.recentBrews.length === 0 && (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  還沒有沖煮紀錄。
                </p>
              )}
              {stats.recentBrews.map((brew) => (
                <Link
                  key={brew.id}
                  href={`/brews/${brew.id}`}
                  className="hover:bg-accent/50 flex items-center justify-between gap-2 rounded-md border px-3 py-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {brew.name_batch}
                      <span className="text-muted-foreground ml-1 text-xs">
                        {brew.roaster}
                      </span>
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {brew.brewed_at?.slice(0, 10)}
                      {brew.ratio_value != null &&
                        ` · ${formatRatio(brew.ratio_value)}`}
                      {brew.rest_days != null && ` · 養豆 ${brew.rest_days} 天`}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm">
                    {'★'.repeat(brew.overall ?? 0)}
                    <span className="text-muted-foreground">
                      {'★'.repeat(Math.max(0, 5 - (brew.overall ?? 0)))}
                    </span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
