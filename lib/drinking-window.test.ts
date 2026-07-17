import { describe, expect, it } from 'vitest'
import { drinkingWindow, inWindow } from './drinking-window'

describe('drinkingWindow（FR-16 適飲區間）', () => {
  it('沖煮 ≥ 3：取喜好度前 50% 的養豆天數 P25–P75（個人化）', () => {
    const brews = [
      { restDays: 5, overall: 2 },
      { restDays: 10, overall: 5 },
      { restDays: 14, overall: 5 },
      { restDays: 20, overall: 4 },
      { restDays: 30, overall: 2 },
      { restDays: 12, overall: 4 },
    ]
    // 前 50%（3 筆最高分，同分 4 穩定排序取先出現的 20）：
    // restDays 10, 14, 20 → P25 = 12、P75 = 17
    const w = drinkingWindow(brews, 'light')
    expect(w.source).toBe('personal')
    expect(w.fromDay).toBe(12)
    expect(w.toDay).toBe(17)
  })

  it('不足 3 筆：按焙度預設', () => {
    expect(drinkingWindow([], 'light')).toEqual({
      fromDay: 10,
      toDay: 30,
      source: 'default',
    })
    expect(drinkingWindow([{ restDays: 7, overall: 5 }], 'medium')).toEqual({
      fromDay: 7,
      toDay: 21,
      source: 'default',
    })
    expect(drinkingWindow([], 'dark')).toEqual({
      fromDay: 5,
      toDay: 14,
      source: 'default',
    })
  })

  it('負養豆天數（未烘焙日誤植）不納入樣本', () => {
    const w = drinkingWindow(
      [
        { restDays: -3, overall: 5 },
        { restDays: 8, overall: 4 },
      ],
      'medium_light',
    )
    expect(w.source).toBe('default')
  })

  it('inWindow 邊界含端點', () => {
    const w = { fromDay: 7, toDay: 21, source: 'default' as const }
    expect(inWindow(6, w)).toBe(false)
    expect(inWindow(7, w)).toBe(true)
    expect(inWindow(21, w)).toBe(true)
    expect(inWindow(22, w)).toBe(false)
  })
})
