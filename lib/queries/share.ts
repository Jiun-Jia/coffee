import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * FR-9 公開分享的資料層（SHARE-2/3；分享頁與配方卡圖片共用）。
 * 以 service_role 按不可猜 slug 查詢（anon RLS 維持空集合不動）；
 * 欄位**白名單**：只 select 可公開欄位——自由備註、下次調整、
 * 價格/購入重量一律不出（FR-9.2）。
 */

const BREW_SHARE_COLUMNS = `
  id, brewed_at, brew_type, dripper, filter, kettle, grind_setting,
  water_temp, dose_g, water_g, ice_g, ratio_include_ice,
  bloom_water_g, bloom_time_sec, total_time_sec, pour_notes,
  aroma, acidity, sweetness, bitterness, body, balance, aftertaste, overall,
  flavor_notes, photo_path, user_id,
  beans(roaster, name_batch, origin, varietal, process, roast_level, roast_date),
  grinders(name), profiles(username)
`

const BEAN_SHARE_COLUMNS = `
  id, roaster, name_batch, origin, varietal, process, altitude, farm,
  roast_level, roast_date, photo_path, user_id, profiles(username)
`

/** React cache：同一請求內 page 與 generateMetadata / og-image 共用一次查詢 */
export const fetchShared = cache(async (slug: string) => {
  const admin = createAdminClient()

  const { data: brew } = await admin
    .from('brews')
    .select(BREW_SHARE_COLUMNS)
    .eq('public_slug', slug)
    .maybeSingle()

  if (brew) {
    const [{ data: pours }, { data: tagRows }] = await Promise.all([
      admin
        .from('brew_pours')
        .select('seq, end_time_sec, cumulative_water_g, note')
        .eq('brew_id', brew.id)
        .order('seq'),
      admin
        .from('brew_flavor_tags')
        .select('flavor_tags(name)')
        .eq('brew_id', brew.id),
    ])
    return {
      type: 'brew' as const,
      brew,
      pours: pours ?? [],
      tags: (tagRows ?? []).flatMap((r) =>
        r.flavor_tags ? [r.flavor_tags.name] : [],
      ),
    }
  }

  const { data: bean } = await admin
    .from('beans')
    .select(BEAN_SHARE_COLUMNS)
    .eq('public_slug', slug)
    .maybeSingle()

  if (bean) {
    // §6 決議-4：只列建立者自己的沖煮（不外洩其他成員的紀錄）
    const { data: brews } = await admin
      .from('brews')
      .select(
        'id, brewed_at, water_temp, dose_g, water_g, ice_g, ratio_include_ice, grind_setting, bloom_water_g, bloom_time_sec, total_time_sec, overall, public_slug',
      )
      .eq('bean_id', bean.id)
      .eq('user_id', bean.user_id)
      .order('brewed_at', { ascending: false })
      .limit(50)

    // 豆卡主角＝最佳一杯（overall 最高、同分取最新），連同它的注水分段
    const best =
      (brews ?? [])
        .filter((b) => b.overall != null)
        .sort(
          (a, b) =>
            (b.overall ?? 0) - (a.overall ?? 0) ||
            b.brewed_at.localeCompare(a.brewed_at),
        )[0] ?? null
    const { data: bestPours } = best
      ? await admin
          .from('brew_pours')
          .select('seq, end_time_sec, cumulative_water_g, note')
          .eq('brew_id', best.id)
          .order('seq')
      : { data: [] }

    return {
      type: 'bean' as const,
      bean,
      brews: brews ?? [],
      best: best ? { ...best, pours: bestPours ?? [] } : null,
    }
  }

  return null
})

export type SharedData = NonNullable<Awaited<ReturnType<typeof fetchShared>>>
export type BrewShared = Extract<SharedData, { type: 'brew' }>
export type BeanShared = Extract<SharedData, { type: 'bean' }>
