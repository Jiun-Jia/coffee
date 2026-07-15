/**
 * 常用器具預設清單（2026-07-14 使用者定案版）。
 * 僅作為「設定頁／群組頁」新增器材時的建議與快速加入，
 * 不會出現在沖煮表單下拉（下拉只列已登錄的器材，依豆子歸屬過濾）。
 * 命名原則：品牌用原文、不重複中譯（Timemore ≠ Timemore 泰摩）。
 * 排序原則：器材清單依字母排序（同品牌自然聚集）；處理法依常見度排列。
 */
export const DRIPPER_PRESETS = [
  'Chemex',
  'Clever 聰明濾杯',
  'Fellow Stagg XF',
  'Hario Mugen 無限',
  'Hario V60',
  'Hario V60 Star Ray',
  'Kalita Wave 185',
  'Kono 名門',
  'Orea V3',
  'Orea V4',
  'Origami 折紙濾杯',
] as const

/** 磨豆機：選擇後自動帶入刀盤類型與備註（新增磨豆機的對話框） */
export const GRINDER_PRESETS: {
  name: string
  burr_type: string
  notes: string
}[] = [
  { name: '1Zpresso J-Ultra', burr_type: '錐刀', notes: '48mm 鍍鈦錐刀，8µm 微調，義式手沖雙修' },
  { name: '1Zpresso K-Ultra', burr_type: '錐刀', notes: '48mm 七角錐刀，外部環直覺調整' },
  { name: '1Zpresso ZP6 Special', burr_type: '錐刀', notes: '細粉極少，茶感與高解析度取向' },
  { name: 'Comandante C40 MK4', burr_type: '錐刀', notes: '39mm Nitro Blade 氮化鋼刀' },
  { name: 'Hario Skerton Pro', burr_type: '錐刀', notes: '陶瓷刀盤，大容量玻璃倉' },
  { name: 'Kingrinder K6', burr_type: '錐刀', notes: '48mm 七角錐刀，外部調控，高 CP 值' },
  { name: 'Kinu M47 Classic', burr_type: '錐刀', notes: '47mm 德製精鋼錐刀，同心度極高' },
  { name: 'Porlex Mini II', burr_type: '錐刀', notes: '日製陶瓷刀盤，輕量可攜' },
  { name: 'Timemore C3 Pro', burr_type: '錐刀', notes: 'S2C 660 不鏽鋼錐刀，全金屬機身' },
  { name: 'Timemore Chestnut X', burr_type: '錐刀', notes: 'S2C 先刺後削雙層刀盤，甜感突出' },
]

export const KETTLE_PRESETS = [
  'Brewista Artisan',
  'Driver 德川細口壺',
  'Fellow Stagg EKG',
  'Hario Alpha',
  'Kalita 大嘴鳥',
  'Kinto Pour Over Kettle',
  'Minos 細口壺',
  'Takahiro 細口壺',
  'Timemore 魚 Smart',
  'Yamazen 溫控壺',
] as const

export const FILTER_PRESETS = [
  'Cafec Abaca',
  'Cafec Abaca+',
  'Cafec T-90',
  'Cafec T-92',
  'Chemex 濾紙',
  'Hario V60 濾紙',
  'Kalita Wave 濾紙',
  'Kono 棉質濾紙',
  'Origami 濾紙',
  'Sibarist FAST',
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
