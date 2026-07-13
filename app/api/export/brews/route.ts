import { createClient } from '@/lib/supabase/server'
import { formatRatio, formatSecondsToMSS } from '@/lib/format'
import {
  BREW_TYPE_LABELS,
  ROAST_LEVEL_LABELS,
} from '@/lib/validations/enums'
import type { Database } from '@/types/database'

type Row = Database['public']['Views']['brew_details']['Row']

/** CSV 欄位跳脫：含逗號/引號/換行則包引號並將引號翻倍 */
function esc(value: string | number | null | undefined): string {
  if (value == null) return ''
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const HEADERS = [
  '日期時間',
  '沖煮類型',
  '烘豆店家',
  '豆名/批次',
  '產地',
  '品種',
  '處理法',
  '焙度',
  '烘焙日期',
  '養豆天數',
  '濾杯',
  '濾紙',
  '刻度',
  '手沖壺',
  '水溫(℃)',
  '粉量(g)',
  '水量(g)',
  '冰量(g)',
  '水粉比',
  '計入冰量',
  '悶蒸水量(g)',
  '悶蒸時間',
  '總時間',
  '注水手法',
  '香氣',
  '酸質',
  '甜感',
  '苦味',
  '口感醇厚度',
  '平衡感',
  '餘韻',
  '整體喜好度',
  '風味標籤',
  '風味補充',
  '下次調整',
  '備註',
]

function toRow(b: Row, tags: string[]): string {
  return [
    b.brewed_at?.slice(0, 16).replace('T', ' '),
    b.brew_type ? BREW_TYPE_LABELS[b.brew_type] : '',
    b.roaster,
    b.name_batch,
    b.origin,
    b.varietal,
    b.process,
    b.roast_level ? ROAST_LEVEL_LABELS[b.roast_level] : '',
    b.roast_date,
    b.rest_days,
    b.dripper,
    b.filter,
    b.grind_setting,
    b.kettle,
    b.water_temp,
    b.dose_g,
    b.water_g,
    b.ice_g,
    b.ratio_value != null ? formatRatio(b.ratio_value) : '',
    b.ratio_include_ice ? '是' : '否',
    b.bloom_water_g,
    b.bloom_time_sec != null ? formatSecondsToMSS(b.bloom_time_sec) : '',
    b.total_time_sec != null ? formatSecondsToMSS(b.total_time_sec) : '',
    b.pour_notes,
    b.aroma,
    b.acidity,
    b.sweetness,
    b.bitterness,
    b.body,
    b.balance,
    b.aftertaste,
    b.overall,
    tags.join('|'), // D17：標籤以 | 分隔
    b.flavor_notes,
    b.next_adjustment,
    b.notes,
  ]
    .map(esc)
    .join(',')
}

/** FR-8：匯出本人全部沖煮為 CSV（UTF-8 BOM，Excel 開繁中不亂碼）。 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // 分批讀取，避開 PostgREST 單次上限（M3-PLAN 風險 #8）
  const rows: Row[] = []
  const PAGE = 500
  for (let fromIdx = 0; ; fromIdx += PAGE) {
    const { data, error } = await supabase
      .from('brew_details')
      .select('*')
      .order('brewed_at', { ascending: false })
      .range(fromIdx, fromIdx + PAGE - 1)
    if (error) return new Response(`匯出失敗：${error.message}`, { status: 500 })
    rows.push(...data)
    if (data.length < PAGE) break
  }

  // 標籤：分批查關聯再組 map
  const tagsByBrew = new Map<string, string[]>()
  const ids = rows.map((r) => r.id).filter(Boolean) as string[]
  const CHUNK = 100
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data } = await supabase
      .from('brew_flavor_tags')
      .select('brew_id, flavor_tags(name)')
      .in('brew_id', ids.slice(i, i + CHUNK))
    for (const row of data ?? []) {
      if (!row.flavor_tags) continue
      const list = tagsByBrew.get(row.brew_id) ?? []
      list.push(row.flavor_tags.name)
      tagsByBrew.set(row.brew_id, list)
    }
  }

  const csv =
    '﻿' + // UTF-8 BOM
    HEADERS.join(',') +
    '\n' +
    rows.map((r) => toRow(r, tagsByBrew.get(r.id ?? '') ?? [])).join('\n')

  const today = new Date(Date.now() + 8 * 3600_000)
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="brewlog-${today}.csv"`,
    },
  })
}
