import { describe, expect, it } from 'vitest'
import { beanSchema } from './bean'
import { brewSchema } from './brew'
import { score1to5, waterTempC, positiveGrams } from './common'

describe('common 邊界值', () => {
  it('score1to5', () => {
    expect(score1to5.safeParse(1).success).toBe(true)
    expect(score1to5.safeParse(5).success).toBe(true)
    expect(score1to5.safeParse(0).success).toBe(false)
    expect(score1to5.safeParse(6).success).toBe(false)
    expect(score1to5.safeParse(3.5).success).toBe(false)
  })
  it('waterTempC', () => {
    expect(waterTempC.safeParse(60).success).toBe(true)
    expect(waterTempC.safeParse(100).success).toBe(true)
    expect(waterTempC.safeParse(59).success).toBe(false)
    expect(waterTempC.safeParse(101).success).toBe(false)
  })
  it('positiveGrams', () => {
    expect(positiveGrams.safeParse(0.1).success).toBe(true)
    expect(positiveGrams.safeParse(0).success).toBe(false)
    expect(positiveGrams.safeParse(10000).success).toBe(false)
  })
})

describe('beanSchema', () => {
  const valid = {
    roaster: '某某烘豆所',
    name_batch: 'Ethiopia Guji',
    origin: '衣索比亞',
    roast_level: 'medium_light',
    roast_date: '2026-06-26',
  }
  it('合法輸入通過，選填空字串轉 undefined', () => {
    const parsed = beanSchema.parse({ ...valid, varietal: '  ' })
    expect(parsed.varietal).toBeUndefined()
  })
  it('缺必填被拒', () => {
    expect(beanSchema.safeParse({ ...valid, roaster: '' }).success).toBe(false)
  })
  it('未知焙度被拒', () => {
    expect(
      beanSchema.safeParse({ ...valid, roast_level: 'extra_dark' }).success,
    ).toBe(false)
  })
  it('非法日期格式被拒', () => {
    expect(
      beanSchema.safeParse({ ...valid, roast_date: '2026/06/26' }).success,
    ).toBe(false)
  })
})

describe('brewSchema', () => {
  const valid = {
    bean_id: '5f0cbecf-2f5a-4f4a-9d5a-0b2f5c4e8a11',
    brewed_at: '2026-07-08T09:30',
    dose_g: 15,
    water_g: 240,
    overall: 4,
  }
  it('最小合法輸入通過並套用預設值', () => {
    const parsed = brewSchema.parse(valid)
    expect(parsed.brew_type).toBe('pour_over')
    expect(parsed.ratio_include_ice).toBe(false)
    expect(parsed.tag_ids).toEqual([])
  })
  it('選填數值空字串轉 undefined', () => {
    const parsed = brewSchema.parse({ ...valid, water_temp: '', aroma: null })
    expect(parsed.water_temp).toBeUndefined()
    expect(parsed.aroma).toBeUndefined()
  })
  it('水溫越界被拒', () => {
    expect(brewSchema.safeParse({ ...valid, water_temp: 59 }).success).toBe(
      false,
    )
  })
  it('缺整體喜好度被拒', () => {
    const rest = { ...valid, overall: undefined }
    expect(brewSchema.safeParse(rest).success).toBe(false)
  })
  it('粉量 0 被拒', () => {
    expect(brewSchema.safeParse({ ...valid, dose_g: 0 }).success).toBe(false)
  })
})
