-- 資料表層級 GRANT。
-- 新版 Supabase 基底映像不再對 anon/authenticated/service_role 預設授予
-- DML 權限（只剩 REFERENCES/TRIGGER/TRUNCATE），必須明確授權；
-- 列層級的隔離仍由 RLS policies 負責（migrations 0007/0008）。
--
-- anon 也授予 select：目前所有 policy 皆 to authenticated，anon 實際 0 列，
-- 但 PostgREST 回空集合而非 42501 錯誤；Phase 2 公開分享亦以此為基礎。

grant usage on schema public to anon, authenticated, service_role;

grant select on all tables in schema public to anon;
grant select, insert, update, delete
  on all tables in schema public to authenticated, service_role;

-- 未來新增的表/檢視表沿用相同權限（migration 以 postgres 身分執行）
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
