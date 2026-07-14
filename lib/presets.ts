/**
 * 常用器具預設清單（2026-07 綜合評測與台灣通路常見度）。
 * 僅作為下拉建議與設定頁快速加入，不會自動寫進使用者清單。
 */
export const DRIPPER_PRESETS = [
  'Hario V60-01',
  'Hario V60-02',
  'Kalita Wave 155',
  'Kalita Wave 185',
  'Origami S',
  'Origami M',
  'Chemex',
  'Clever 聰明濾杯',
  'Orea V3',
  'Kono 名門',
] as const

export const GRINDER_PRESETS = [
  'Comandante C40',
  '1Zpresso K-Ultra',
  '1Zpresso J-Ultra',
  '1Zpresso Q2',
  'Timemore C3',
  'Timemore S3',
  'Kingrinder K6',
  'Fellow Ode Gen 2',
  'Baratza Encore',
  '小富士鬼齒',
] as const

export const KETTLE_PRESETS = [
  'Fellow Stagg EKG',
  'Brewista Artisan',
  'Timemore Fish Smart',
  'Hario Buono',
  'Bonavita 溫控壺',
  'Kalita 鶴嘴壺',
  '月兔印',
  'HMM Bär',
] as const

export const FILTER_PRESETS = [
  'Hario V60 漂白',
  'Hario V60 無漂白',
  'Cafec Abaca',
  'Kalita Wave 濾紙',
  'Chemex 濾紙',
  'Origami 錐形濾紙',
] as const

/** 處理法常用清單（下拉＋可自填；DB 仍存 text，清單外的值照樣可用） */
export const PROCESS_PRESETS = [
  '水洗',
  '日曬',
  '蜜處理',
  '黃蜜',
  '紅蜜',
  '黑蜜',
  '白蜜',
  '厭氧日曬',
  '厭氧水洗',
  '厭氧蜜處理',
  '碳浸漬',
  '酒桶發酵',
  '濕剝法',
] as const
