-- FR-22 照片上傳（W4 / PHOTO-1）
-- 豆袋標籤照（beans）＋成品照（brews）各一張；檔案存 Supabase Storage
-- private bucket，路徑約定 {user_id}/{bean|brew}/{row_id}.webp。
-- 讀取一律由 server 以 service_role 產生簽名 URL（可見性在 server 端以
-- 一般 RLS 讀 row 判定），storage 不開 select 政策；寫入/刪除限本人資料夾。

alter table public.beans add column photo_path text;
alter table public.brews add column photo_path text;

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- storage.objects 寫入政策：只准動自己 {user_id}/ 開頭的路徑
create policy photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy photos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 上傳（upsert）與刪除前 storage API 會先 select 既有物件：
-- 限本人資料夾（不影響「跨人讀」——跨人讀走 server 簽名 URL）
create policy photos_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
