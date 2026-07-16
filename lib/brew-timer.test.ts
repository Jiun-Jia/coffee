import { describe, expect, it } from 'vitest'
import {
  completedLaps,
  deviationLabel,
  elapsedSeconds,
  nextTarget,
  planLap,
  MAX_POURS,
} from './brew-timer'
import type { PourFormValue } from './brew-form'

const pour = (over: Partial<PourFormValue> = {}): PourFormValue => ({
  end_time_sec: undefined,
  cumulative_water_g: undefined,
  note: '',
  ...over,
})

describe('planLap（分段的 update-or-append 語意）', () => {
  it('該列已存在（配方計畫值）→ 覆寫該列', () => {
    const pours = [pour({ end_time_sec: 45 }), pour({ end_time_sec: 75 })]
    expect(planLap(pours, 0)).toEqual({ action: 'update', index: 0 })
    expect(planLap(pours, 1)).toEqual({ action: 'update', index: 1 })
  })

  it('超出既有列數 → 追加', () => {
    const pours = [pour()]
    expect(planLap(pours, 1)).toEqual({ action: 'append', index: 1 })
    expect(planLap([], 0)).toEqual({ action: 'append', index: 0 })
  })

  it('達 12 段上限 → full', () => {
    const pours = Array.from({ length: MAX_POURS }, () => pour())
    expect(planLap(pours, MAX_POURS)).toEqual({ action: 'full' })
    // 上限內的既有列仍可覆寫
    expect(planLap(pours, 11)).toEqual({ action: 'update', index: 11 })
  })
})

describe('nextTarget（引導目標）', () => {
  it('下一列有計畫值 → 作為目標', () => {
    const pours = [pour({ end_time_sec: 45, cumulative_water_g: 60 })]
    expect(nextTarget(pours, 0)).toEqual(pours[0])
  })

  it('只有水量或手法也算目標', () => {
    expect(nextTarget([pour({ cumulative_water_g: 120 })], 0)).not.toBeNull()
    expect(nextTarget([pour({ note: '中心繞圈' })], 0)).not.toBeNull()
  })

  it('全空列或超出範圍 → 無目標', () => {
    expect(nextTarget([pour()], 0)).toBeNull()
    expect(nextTarget([], 0)).toBeNull()
    expect(nextTarget([pour({ end_time_sec: 45 })], 1)).toBeNull()
  })
})

describe('deviationLabel（實際 vs 目標偏差）', () => {
  it('晚於目標 → +N 秒', () => {
    expect(deviationLabel(48, 45)).toBe('較目標 +3 秒')
  })
  it('早於目標 → -N 秒', () => {
    expect(deviationLabel(42, 45)).toBe('較目標 -3 秒')
  })
  it('準時', () => {
    expect(deviationLabel(45, 45)).toBe('準時')
  })
  it('無目標 → null', () => {
    expect(deviationLabel(48, undefined)).toBeNull()
  })
})

describe('completedLaps（專注模式的唯讀分段清單）', () => {
  it('取前 lapCount 列、最新在前', () => {
    const pours = [
      pour({ end_time_sec: 45 }),
      pour({ end_time_sec: 90 }),
      pour({ end_time_sec: 135 }), // 尚未計時到的計畫段
    ]
    expect(completedLaps(pours, 2)).toEqual([
      { seq: 2, pour: pours[1] },
      { seq: 1, pour: pours[0] },
    ])
  })

  it('lapCount 超過列數時以實際列數為準', () => {
    const pours = [pour({ end_time_sec: 45 })]
    expect(completedLaps(pours, 5)).toEqual([{ seq: 1, pour: pours[0] }])
  })

  it('lapCount 為 0 或負值 → 空清單', () => {
    expect(completedLaps([pour()], 0)).toEqual([])
    expect(completedLaps([pour()], -1)).toEqual([])
  })
})

describe('elapsedSeconds（時間戳重算，背景分頁不失準）', () => {
  it('取整數秒、不足一秒無條件捨去', () => {
    expect(elapsedSeconds(1_000, 3_999)).toBe(2)
    expect(elapsedSeconds(1_000, 4_000)).toBe(3)
  })
  it('時鐘倒退時不出現負值', () => {
    expect(elapsedSeconds(5_000, 4_000)).toBe(0)
  })
})
