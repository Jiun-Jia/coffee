-- FR-9 公開分享（W4 / SHARE-1）
-- public_slug 非 null＝已公開；slug 不可猜（server 端產生 16 碼 base64url）。
-- 公開頁讀取走 server 的 service_role（欄位白名單輸出），不開 anon RLS——
-- anon 對這兩表本就只有空集合，維持不變。
-- 取消公開＝清空 slug（舊連結立即 404）；重新公開產生新 slug（FR-9.3）。

alter table public.beans add column public_slug text unique;
alter table public.brews add column public_slug text unique;
