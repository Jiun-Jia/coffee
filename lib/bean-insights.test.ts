import { describe, expect, it } from 'vitest'
import { beanInsights, type InsightBrew } from './bean-insights'

const brew = (over: Partial<InsightBrew> & { overall: number }): InsightBrew => ({
  waterTemp: null,
  ratioValue: null,
  grinderId: null,
  grinderName: null,
  grindSetting: null,
  ...over,
})

describe('beanInsights（FR-19 規則式觀察）', () => {
  it('水溫分桶：兩側樣本 ≥ 3 且差 ≥ 0.5 → 產生觀察句', () => {
    const brews = [
      // 92-93°C 桶：平均 4.67
      brew({ waterTemp: 92, overall: 5 }),
      brew({ waterTemp: 93, overall: 5 }),
      brew({ waterTemp: 92, overall: 4 }),
      // 其他：平均 3
      brew({ waterTemp: 88, overall: 3 }),
      brew({ waterTemp: 88, overall: 3 }),
      brew({ waterTemp: 90, overall: 3 }),
    ]
    const insights = beanInsights(brews)
    expect(insights).toHaveLength(1)
    expect(insights[0].text).toContain('水溫 92–93°C')
    expect(insights[0].text).toContain('★4.7')
    expect(insights[0].text).toContain('1.7 分')
    expect(insights[0].text).toContain('3 vs 3 杯')
  })

  it('差 < 0.5 分不出句（防噪音）', () => {
    const brews = [
      brew({ waterTemp: 92, overall: 4 }),
      brew({ waterTemp: 92, overall: 4 }),
      brew({ waterTemp: 92, overall: 4 }),
      brew({ waterTemp: 88, overall: 4 }),
      brew({ waterTemp: 88, overall: 4 }),
      brew({ waterTemp: 88, overall: 3 }),
    ]
    expect(beanInsights(brews)).toHaveLength(0)
  })

  it('單側樣本 < 3 不出句（防小樣本）', () => {
    const brews = [
      brew({ waterTemp: 92, overall: 5 }),
      brew({ waterTemp: 92, overall: 5 }),
      brew({ waterTemp: 88, overall: 2 }),
      brew({ waterTemp: 88, overall: 2 }),
      brew({ waterTemp: 88, overall: 2 }),
    ]
    expect(beanInsights(brews)).toHaveLength(0)
  })

  it('刻度僅同磨豆機內比較，且句子帶磨豆機名', () => {
    const g = { grinderId: 'g1', grinderName: 'C40' }
    const brews = [
      brew({ ...g, grindSetting: '22', overall: 5 }),
      brew({ ...g, grindSetting: '22', overall: 5 }),
      brew({ ...g, grindSetting: '22', overall: 4 }),
      brew({ ...g, grindSetting: '26', overall: 3 }),
      brew({ ...g, grindSetting: '26', overall: 3 }),
      brew({ ...g, grindSetting: '28', overall: 3 }),
      // 另一台機的資料不參與 C40 的比較
      brew({ grinderId: 'g2', grinderName: 'K6', grindSetting: '60', overall: 1 }),
    ]
    const insights = beanInsights(brews)
    expect(insights).toHaveLength(1)
    expect(insights[0].text).toContain('C40 刻度 22')
  })

  it('多維度按差距排序、最多 3 則', () => {
    const brews = [
      // 水溫差 2 分
      brew({ waterTemp: 92, ratioValue: 15.2, overall: 5 }),
      brew({ waterTemp: 92, ratioValue: 15.3, overall: 5 }),
      brew({ waterTemp: 92, ratioValue: 15.1, overall: 5 }),
      brew({ waterTemp: 88, ratioValue: 16.1, overall: 3 }),
      brew({ waterTemp: 88, ratioValue: 16.2, overall: 3 }),
      brew({ waterTemp: 88, ratioValue: 16.3, overall: 3 }),
    ]
    const insights = beanInsights(brews)
    expect(insights.length).toBeLessThanOrEqual(3)
    expect(insights.length).toBeGreaterThanOrEqual(2)
    // 排序遞減
    for (let i = 1; i < insights.length; i++) {
      expect(insights[i - 1].diff).toBeGreaterThanOrEqual(insights[i].diff)
    }
  })
})
