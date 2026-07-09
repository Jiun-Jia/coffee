-- brew_details：沖煮 + 豆子履歷 + 衍生欄位（FR-4，DESIGN §A.5）
--
-- 關鍵一：security_invoker = true —— 以查詢者權限執行、RLS 正常套用。
--   沒有這行，view 會以 owner 權限執行、繞過 RLS 造成跨使用者資料外洩。
-- 關鍵二：rest_days 以 Asia/Taipei 取日（統一時區口徑，避免 UTC 在早上 8 點前差一天；
--   與 lib/format.ts 的 calcRestDays（本地日期）一致，使用者在台灣）。
-- 關鍵三：view 包含 beans.process / varietal，供 P3 處理法篩選（FR-7.1，M3-PLAN §2 修正）。

create view public.brew_details
with (security_invoker = true)
as
select
  b.*,
  bn.roaster,
  bn.name_batch,
  bn.origin,
  bn.varietal,
  bn.process,
  bn.roast_level,
  bn.roast_date,
  ((b.brewed_at at time zone 'Asia/Taipei')::date - bn.roast_date) as rest_days,
  round(
    (
      b.water_g
      + case when b.ratio_include_ice then coalesce(b.ice_g, 0) else 0 end
    ) / b.dose_g,
    1
  ) as ratio_value
from public.brews b
join public.beans bn on bn.id = b.bean_id;
