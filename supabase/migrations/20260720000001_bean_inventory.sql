-- FR-15 豆量庫存與封存 ＋ FR-18 價格（W2 / INV-1）
-- 全部 additive：三個 nullable 欄位＋一個彙總 view，不動既有資料與 RLS。
--   purchase_weight_g：購入重量；剩餘量 = 購入重量 − 全部沖煮粉量加總
--   price            ：整包價格（新台幣整數，FR-18.1）
--   archived_at      ：封存時間（null＝在用；封存豆退出下拉與在養統計）

alter table public.beans
  add column purchase_weight_g numeric(6, 2) check (purchase_weight_g > 0),
  add column price int check (price >= 0),
  add column archived_at timestamptz;

-- 每豆用量彙總（庫存與成本共用）。security_invoker：只加總呼叫者
-- 看得到的沖煮——群組豆全員沖煮互相可見，剩餘量天然計全員用量
-- （FR-15.1 共豆＝共用同一包）；個人豆只有本人的沖煮。
create view public.bean_usage
with (security_invoker = true) as
select
  bean_id,
  sum(dose_g)::numeric(8, 2) as total_dose_g,
  avg(dose_g)::numeric(8, 2) as avg_dose_g,
  count(*)::int as brew_count
from public.brews
group by bean_id;
