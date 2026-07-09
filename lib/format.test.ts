import { describe, expect, it } from 'vitest'
import {
  calcRatioValue,
  calcRestDays,
  formatRatio,
  formatSecondsToMSS,
  parseTimeToSeconds,
} from './format'

describe('formatSecondsToMSS', () => {
  it('格式化一般值', () => {
    expect(formatSecondsToMSS(150)).toBe('2:30')
    expect(formatSecondsToMSS(30)).toBe('0:30')
    expect(formatSecondsToMSS(0)).toBe('0:00')
    expect(formatSecondsToMSS(630)).toBe('10:30')
    expect(formatSecondsToMSS(59)).toBe('0:59')
    expect(formatSecondsToMSS(60)).toBe('1:00')
  })
  it('非法值回空字串', () => {
    expect(formatSecondsToMSS(-1)).toBe('')
    expect(formatSecondsToMSS(Number.NaN)).toBe('')
  })
})

describe('parseTimeToSeconds', () => {
  it('接受 m:ss', () => {
    expect(parseTimeToSeconds('2:30')).toBe(150)
    expect(parseTimeToSeconds('0:30')).toBe(30)
    expect(parseTimeToSeconds('10:05')).toBe(605)
    expect(parseTimeToSeconds('1:5')).toBe(65)
  })
  it('接受純秒數', () => {
    expect(parseTimeToSeconds('150')).toBe(150)
    expect(parseTimeToSeconds('90')).toBe(90)
    expect(parseTimeToSeconds(' 45 ')).toBe(45)
  })
  it('非法輸入回 null', () => {
    expect(parseTimeToSeconds('2:75')).toBeNull()
    expect(parseTimeToSeconds('abc')).toBeNull()
    expect(parseTimeToSeconds('')).toBeNull()
    expect(parseTimeToSeconds('-30')).toBeNull()
    expect(parseTimeToSeconds('1:2:3')).toBeNull()
  })
})

describe('calcRatioValue', () => {
  it('基本計算與捨入到一位小數', () => {
    expect(calcRatioValue(240, 15, null, false)).toBe(16)
    expect(calcRatioValue(100, 3, null, false)).toBe(33.3)
    // .x5 邊界：232.5 / 15 = 15.5
    expect(calcRatioValue(232.5, 15, null, false)).toBe(15.5)
  })
  it('計入冰量開關', () => {
    expect(calcRatioValue(200, 15, 40, true)).toBe(16)
    expect(calcRatioValue(200, 15, 40, false)).toBe(13.3)
    expect(calcRatioValue(200, 15, null, true)).toBe(13.3)
  })
  it('粉量不為正數回 null', () => {
    expect(calcRatioValue(240, 0, null, false)).toBeNull()
    expect(calcRatioValue(240, -1, null, false)).toBeNull()
  })
})

describe('formatRatio', () => {
  it('一律一位小數（D21）', () => {
    expect(formatRatio(16)).toBe('1:16.0')
    expect(formatRatio(15.5)).toBe('1:15.5')
  })
})

describe('calcRestDays', () => {
  it('本地日期相減', () => {
    expect(calcRestDays(new Date(2026, 6, 8, 9, 30), '2026-06-26')).toBe(12)
    expect(calcRestDays(new Date(2026, 6, 8, 0, 5), '2026-07-08')).toBe(0)
  })
  it('允許負值（未來烘焙日）', () => {
    expect(calcRestDays(new Date(2026, 6, 8), '2026-07-10')).toBe(-2)
  })
  it('非法日期回 null', () => {
    expect(calcRestDays(new Date(), 'not-a-date')).toBeNull()
  })
})
