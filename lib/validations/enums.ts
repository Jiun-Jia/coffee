import { z } from 'zod'

/**
 * DB enum 存穩定英文碼、前端顯示繁體中文（DESIGN §A.2）。
 * 這裡是唯一對照來源；新增值時需同步 DB migration（alter type ... add value）。
 */

export const ROAST_LEVELS = [
  'light',
  'medium_light',
  'medium',
  'medium_dark',
  'dark',
] as const
export type RoastLevel = (typeof ROAST_LEVELS)[number]

export const ROAST_LEVEL_LABELS: Record<RoastLevel, string> = {
  light: '淺焙',
  medium_light: '中淺焙',
  medium: '中焙',
  medium_dark: '中深焙',
  dark: '深焙',
}

export const ROAST_LEVEL_OPTIONS = ROAST_LEVELS.map((value) => ({
  value,
  label: ROAST_LEVEL_LABELS[value],
}))

export const roastLevelSchema = z.enum(ROAST_LEVELS)

export const BREW_TYPES = ['pour_over', 'iced_pour_over'] as const
export type BrewType = (typeof BREW_TYPES)[number]

export const BREW_TYPE_LABELS: Record<BrewType, string> = {
  pour_over: '手沖',
  iced_pour_over: '冰手沖',
}

export const BREW_TYPE_OPTIONS = BREW_TYPES.map((value) => ({
  value,
  label: BREW_TYPE_LABELS[value],
}))

export const brewTypeSchema = z.enum(BREW_TYPES)
