-- 重置「內容資料」，保留帳號與系統內建標籤。
-- 用途：清掉測試資料重新開始（所有使用者的內容都會清除！）
--
-- 保留：auth.users、profiles（帳號＋使用者名稱）、flavor_tags(scope='system')
-- 清除：沖煮（含注水分段、掛標）、豆子、磨豆機、器材、群組（含成員、
--       入群申請）、自訂/群組標籤、標籤提交
--
-- 執行方式：
--   雲端：Supabase Dashboard → SQL Editor 貼上執行
--   本機：docker exec -i supabase_db_coffee psql -U postgres -d postgres -f - < 本檔

begin;

delete from public.brews;        -- cascade：brew_pours、brew_flavor_tags
delete from public.beans;
delete from public.grinders;
delete from public.equipment;
delete from public.tag_suggestions;
delete from public.flavor_tags where scope <> 'system'; -- 保留系統內建
delete from public.groups;       -- cascade：group_members、group_join_requests

commit;

-- 驗證：上排應全為 0；下排為保留數
select
  (select count(*) from public.brews)                                as brews,
  (select count(*) from public.beans)                                as beans,
  (select count(*) from public.grinders)                             as grinders,
  (select count(*) from public.equipment)                            as equipment,
  (select count(*) from public.groups)                               as groups,
  (select count(*) from public.group_members)                        as members,
  (select count(*) from public.group_join_requests)                  as join_reqs,
  (select count(*) from public.tag_suggestions)                      as suggestions,
  (select count(*) from public.flavor_tags where scope <> 'system')  as user_tags,
  (select count(*) from public.profiles)                             as profiles_kept,
  (select count(*) from public.flavor_tags where scope = 'system')   as system_tags_kept;
