import type { Metadata } from 'next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AnalyticsFilters } from '@/components/analytics/analytics-filters'
import { RadarPicker } from '@/components/analytics/radar-picker'
import { RestDaysChart } from '@/components/charts/rest-days-chart'
import { TagStatsChart } from '@/components/charts/tag-stats-chart'
import { VariableScatter } from '@/components/charts/variable-scatter'
import { toBrewFilters, type BrewSearchParams } from '@/lib/brew-filters'
import { fetchTagStats } from '@/lib/queries/analytics'
import { listBeans } from '@/lib/queries/beans'
import { listBrews } from '@/lib/queries/brews'
import { listGrinders } from '@/lib/queries/grinders'

export const metadata: Metadata = { title: '分析' }

// P9：A2 / A3 / A4 / A5 四象限（FR-6），可套 §7 篩選
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<BrewSearchParams>
}) {
  const sp = await searchParams
  const filters = toBrewFilters(sp)

  const [brews, beans, grinders] = await Promise.all([
    listBrews(filters),
    listBeans(),
    listGrinders(),
  ])
  const tagStats = await fetchTagStats(brews)

  const grinderName = new Map(grinders.map((g) => [g.id, g.name]))
  const scored = brews.filter((b) => b.overall != null)

  const restDayPoints = scored
    .filter((b) => b.rest_days != null)
    .map((b) => ({
      rest_days: b.rest_days as number,
      overall: b.overall as number,
    }))

  const scatterBrews = scored.map((b) => ({
    id: b.id as string,
    label: `${b.brewed_at?.slice(5, 10)} ${b.name_batch}`,
    overall: b.overall as number,
    water_temp: b.water_temp,
    ratio_value: b.ratio_value,
    water_g: b.water_g,
    grind_setting: b.grind_setting,
    grinder_id: b.grinder_id,
    grinder_name: b.grinder_id
      ? (grinderName.get(b.grinder_id) ?? null)
      : null,
  }))

  const radarOptions = brews
    .filter(
      (b) =>
        b.overall != null ||
        b.aroma != null ||
        b.acidity != null ||
        b.sweetness != null,
    )
    .slice(0, 30)
    .map((b) => ({
      id: b.id as string,
      label: `${b.brewed_at?.slice(0, 10)} ${b.name_batch}${b.overall != null ? ` ★${b.overall}` : ''}`,
      scores: {
        aroma: b.aroma,
        acidity: b.acidity,
        sweetness: b.sweetness,
        bitterness: b.bitterness,
        body: b.body,
        balance: b.balance,
        aftertaste: b.aftertaste,
        overall: b.overall,
      },
    }))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">分析</h1>
      <AnalyticsFilters
        beans={beans.map((b) => ({ id: b.id, label: b.name_batch }))}
        origins={[...new Set(beans.map((b) => b.origin).filter(Boolean))]}
      />
      <p className="text-muted-foreground text-sm">
        共 {brews.length} 筆沖煮納入分析
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">喜好度 vs 變因</CardTitle>
            <CardDescription>
              找出哪個變因對你的喜好影響最大（A2）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VariableScatter brews={scatterBrews} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">適飲窗口</CardTitle>
            <CardDescription>
              養豆天數 vs 整體喜好度，找出最佳賞味期（A3）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RestDaysChart points={restDayPoints} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">風味標籤統計</CardTitle>
            <CardDescription>
              各標籤出現次數與平均喜好度，前 15 名（A4）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TagStatsChart stats={tagStats} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">感官雷達</CardTitle>
            <CardDescription>
              疊加比較最多 5 筆沖煮的八維感官（A5）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadarPicker options={radarOptions} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
