import { describe, expect, it } from 'vitest'
import { beanInventory, perCupCost } from './bean-inventory'

describe('beanInventory（FR-15 剩餘量）', () => {
  it('剩餘 = 購入重量 − 用量加總；預估杯數以平均粉量下取整', () => {
    expect(beanInventory(200, 45, 15)).toEqual({
      remainingG: 155,
      estCupsLeft: 10,
      lowStock: false,
      depleted: false,
    })
  })

  it('無沖煮紀錄：剩餘＝購入重量、杯數未知', () => {
    expect(beanInventory(200, null, null)).toEqual({
      remainingG: 200,
      estCupsLeft: null,
      lowStock: false,
      depleted: false,
    })
  })

  it('剩餘不足一杯 → lowStock；≤ 0 → depleted（FR-15.2/15.4）', () => {
    expect(beanInventory(200, 190, 15)).toMatchObject({
      remainingG: 10,
      lowStock: true,
      depleted: false,
    })
    expect(beanInventory(200, 210, 15)).toMatchObject({
      remainingG: -10,
      estCupsLeft: 0,
      lowStock: true,
      depleted: true,
    })
  })

  it('未填購入重量 → null（FR-15.5 向下相容）', () => {
    expect(beanInventory(null, 100, 15)).toBeNull()
  })

  it('小數用量取一位小數', () => {
    expect(beanInventory(200, 45.25, 15.1)?.remainingG).toBe(154.8)
  })
})

describe('perCupCost（FR-18.2 每杯成本）', () => {
  it('價格 ×（粉量 ÷ 購入重量），四捨五入到整數', () => {
    expect(perCupCost(450, 200, 15)).toBe(34) // 450*15/200 = 33.75
  })

  it('缺價格或購入重量或粉量 → null', () => {
    expect(perCupCost(null, 200, 15)).toBeNull()
    expect(perCupCost(450, null, 15)).toBeNull()
    expect(perCupCost(450, 200, null)).toBeNull()
    expect(perCupCost(450, 0, 15)).toBeNull()
  })
})
