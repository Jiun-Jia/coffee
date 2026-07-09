-- 內建風味標籤（PRD §8，scope=system）。
-- 冪等：on conflict 吃 uq_tag_system partial unique index，重跑不產生重複。
-- 本機 `supabase db reset` 自動執行；雲端需手動跑一次（README schema 變更 SOP）。

insert into public.flavor_tags (name, category, scope) values
  -- 花香
  ('茉莉', '花香', 'system'),
  ('玫瑰', '花香', 'system'),
  ('洋甘菊', '花香', 'system'),
  ('橙花', '花香', 'system'),
  -- 莓果
  ('藍莓', '莓果', 'system'),
  ('草莓', '莓果', 'system'),
  ('覆盆子', '莓果', 'system'),
  ('黑醋栗', '莓果', 'system'),
  -- 柑橘
  ('檸檬', '柑橘', 'system'),
  ('柳橙', '柑橘', 'system'),
  ('葡萄柚', '柑橘', 'system'),
  ('萊姆', '柑橘', 'system'),
  -- 核果/水果
  ('水蜜桃', '核果/水果', 'system'),
  ('杏桃', '核果/水果', 'system'),
  ('李子', '核果/水果', 'system'),
  ('蘋果', '核果/水果', 'system'),
  ('葡萄', '核果/水果', 'system'),
  -- 熱帶水果
  ('芒果', '熱帶水果', 'system'),
  ('鳳梨', '熱帶水果', 'system'),
  ('百香果', '熱帶水果', 'system'),
  ('荔枝', '熱帶水果', 'system'),
  -- 堅果
  ('杏仁', '堅果', 'system'),
  ('榛果', '堅果', 'system'),
  ('花生', '堅果', 'system'),
  -- 巧克力/可可
  ('黑巧克力', '巧克力/可可', 'system'),
  ('牛奶巧克力', '巧克力/可可', 'system'),
  ('可可', '巧克力/可可', 'system'),
  -- 焦糖/甜香
  ('焦糖', '焦糖/甜香', 'system'),
  ('紅糖', '焦糖/甜香', 'system'),
  ('蜂蜜', '焦糖/甜香', 'system'),
  ('楓糖', '焦糖/甜香', 'system'),
  ('麥芽', '焦糖/甜香', 'system'),
  -- 香料
  ('肉桂', '香料', 'system'),
  ('丁香', '香料', 'system'),
  ('荳蔻', '香料', 'system'),
  -- 發酵/酒香
  ('酒香', '發酵/酒香', 'system'),
  ('蘭姆酒', '發酵/酒香', 'system'),
  ('發酵水果', '發酵/酒香', 'system'),
  ('酒釀', '發酵/酒香', 'system'),
  -- 茶感/草本
  ('紅茶', '茶感/草本', 'system'),
  ('烏龍', '茶感/草本', 'system'),
  ('青草', '茶感/草本', 'system'),
  ('藥草', '茶感/草本', 'system'),
  -- 烘焙/焦香
  ('煙燻', '烘焙/焦香', 'system'),
  ('烘烤', '烘焙/焦香', 'system'),
  ('焦香', '烘焙/焦香', 'system')
on conflict (name) where scope = 'system' do nothing;
