import { describe, expect, it } from 'vitest'
import { parseRecipePours } from './recipe-form'

describe('parseRecipePours（jsonb 快照的讀取端驗證）', () => {
  it('正常快照 → 表單值（null 正規化為 undefined / 空字串）', () => {
    expect(
      parseRecipePours([
        { end_time_sec: 45, cumulative_water_g: 60, note: '中心繞圈' },
        { end_time_sec: 90, cumulative_water_g: null, note: null },
      ]),
    ).toEqual([
      { end_time_sec: 45, cumulative_water_g: 60, note: '中心繞圈' },
      { end_time_sec: 90, cumulative_water_g: undefined, note: '' },
    ])
  })

  it('非陣列（手動改庫/舊格式）→ 空陣列', () => {
    expect(parseRecipePours(null)).toEqual([])
    expect(parseRecipePours('bad')).toEqual([])
    expect(parseRecipePours({ end_time_sec: 45 })).toEqual([])
  })

  it('壞列丟棄、好列保留', () => {
    expect(
      parseRecipePours([
        { end_time_sec: -1 }, // 違反 min(0)
        { end_time_sec: 30 },
        'garbage',
      ]),
    ).toEqual([{ end_time_sec: 30, cumulative_water_g: undefined, note: '' }])
  })
})
