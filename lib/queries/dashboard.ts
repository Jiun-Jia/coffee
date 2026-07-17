import {
  drinkingWindow,
  inWindow,
  type DrinkingWindow,
} from '@/lib/drinking-window'
import { calcRestDays } from '@/lib/format'
import { listBeans } from '@/lib/queries/beans'
import { listBrews, type BrewDetailRow } from '@/lib/queries/brews'

export type DrinkableBean = {
  id: string
  name: string
  day: number
  window: DrinkingWindow
}

export type DashboardStats = {
  monthCount: number
  monthAvgOverall: number | null
  favoriteBean: { id: string; name: string; count: number } | null
  restingBeans: number
  recentBrews: BrewDetailRow[]
  totalBeans: number
  /** FR-16 適飲中：目前落在最佳適飲區間的未封存豆 */
  drinkableBeans: DrinkableBean[]
}

/** 台北時區的本月起點（ISO）。伺服器可能在 UTC（Vercel），不可用本地月界。 */
function taipeiMonthStartISO(now = new Date()): string {
  const taipei = new Date(now.getTime() + 8 * 3600_000)
  const y = taipei.getUTCFullYear()
  const m = String(taipei.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01T00:00:00+08:00`
}

/**
 * P2 統計（D16）：本月沖煮數、本月平均喜好度、最常用豆子（近 90 天）、
 * 在養豆子數（烘焙日 60 天內）。個人量級直接以 listBrews 聚合。
 * FR-10 後統計只算「自己的」沖煮（uid）；最近沖煮保留群組成員的（動態感）。
 */
export async function fetchDashboardStats(
  uid: string,
): Promise<DashboardStats> {
  const [visibleBrews, beans] = await Promise.all([listBrews(), listBeans()])
  const brews = visibleBrews.filter((b) => b.user_id === uid)

  const monthStart = new Date(taipeiMonthStartISO())
  const monthBrews = brews.filter(
    (b) => b.brewed_at && new Date(b.brewed_at) >= monthStart,
  )
  const monthScores = monthBrews
    .map((b) => b.overall)
    .filter((n): n is number => n != null)

  // 最常用豆子：近 90 天沖煮次數最多
  const cutoff90 = new Date(Date.now() - 90 * 86_400_000)
  const beanCount = new Map<string, number>()
  for (const b of brews) {
    if (!b.bean_id || !b.brewed_at || new Date(b.brewed_at) < cutoff90) continue
    beanCount.set(b.bean_id, (beanCount.get(b.bean_id) ?? 0) + 1)
  }
  let favoriteBean: DashboardStats['favoriteBean'] = null
  for (const [id, count] of beanCount) {
    if (!favoriteBean || count > favoriteBean.count) {
      const bean = beans.find((be) => be.id === id)
      if (bean) favoriteBean = { id, name: bean.name_batch, count }
    }
  }

  // 在養豆子：烘焙日在 60 天內（仍在賞味窗口的粗略定義）；封存豆不計（FR-15.3）
  const cutoff60 = new Date(Date.now() - 60 * 86_400_000)
  const restingBeans = beans.filter(
    (b) =>
      b.archived_at === null &&
      new Date(`${b.roast_date}T00:00:00+08:00`) >= cutoff60,
  ).length

  // FR-16 適飲中（WIN-2）：以「我的」沖煮個人化區間，未封存豆逐支判定
  const myScoredByBean = new Map<
    string,
    { restDays: number; overall: number }[]
  >()
  for (const b of brews) {
    if (!b.bean_id || b.rest_days == null || b.overall == null) continue
    const list = myScoredByBean.get(b.bean_id) ?? []
    list.push({ restDays: b.rest_days, overall: b.overall })
    myScoredByBean.set(b.bean_id, list)
  }
  const drinkableBeans: DrinkableBean[] = beans
    .filter((bean) => bean.archived_at === null)
    .flatMap((bean) => {
      const day = calcRestDays(new Date(), bean.roast_date)
      if (day == null || day < 0) return []
      const window = drinkingWindow(
        myScoredByBean.get(bean.id) ?? [],
        bean.roast_level,
      )
      return inWindow(day, window)
        ? [{ id: bean.id, name: bean.name_batch, day, window }]
        : []
    })
    .sort((a, b) => a.day - b.day)
    .slice(0, 5)

  return {
    monthCount: monthBrews.length,
    monthAvgOverall:
      monthScores.length > 0
        ? Math.round(
            (monthScores.reduce((a, b) => a + b, 0) / monthScores.length) * 10,
          ) / 10
        : null,
    favoriteBean,
    restingBeans,
    recentBrews: visibleBrews.slice(0, 5), // 含群組成員的最新動態
    totalBeans: beans.length,
    drinkableBeans,
  }
}
