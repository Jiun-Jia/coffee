-- 列表縮圖（PHOTO-3 補完）：brew_details 重建以帶入 brews 的新欄位。
-- view 的 b.* 在「建立當下」展開凍結——photo_path/public_slug（W4）
-- 不在 2026-07-14 版的展開裡；create or replace 不允許中段插欄，
-- 照 20260714000001 的前例 drop 重建（PostgREST 取欄位靠名稱，順序無妨）。

drop view if exists public.brew_details;
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
  bn.group_id,
  ((b.brewed_at at time zone 'Asia/Taipei')::date - bn.roast_date) as rest_days,
  round(
    (
      b.water_g
      + case when b.ratio_include_ice then coalesce(b.ice_g, 0) else 0 end
    ) / b.dose_g,
    1
  ) as ratio_value,
  p.username as brewer_username
from public.brews b
join public.beans bn on bn.id = b.bean_id
left join public.profiles p on p.id = b.user_id;
