-- RLS：擁有者隔離（FR-1.3，DESIGN §A.6）
-- 原則：資料預設私有、後端層強制；policy 一律 to authenticated（anon 無任何存取）。
-- 每條寫入 policy 都必須有 with check，否則可插入/改成他人 user_id 的資料。

alter table public.profiles enable row level security;
alter table public.grinders enable row level security;
alter table public.beans enable row level security;
alter table public.brews enable row level security;
alter table public.tag_suggestions enable row level security;

-- profiles：本人可讀、可改（username）；insert 由 handle_new_user trigger 負責（security definer），不開 delete
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- grinders
create policy grinders_select_own on public.grinders
  for select to authenticated
  using (user_id = auth.uid());

create policy grinders_insert_own on public.grinders
  for insert to authenticated
  with check (user_id = auth.uid());

create policy grinders_update_own on public.grinders
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy grinders_delete_own on public.grinders
  for delete to authenticated
  using (user_id = auth.uid());

-- beans
create policy beans_select_own on public.beans
  for select to authenticated
  using (user_id = auth.uid());

create policy beans_insert_own on public.beans
  for insert to authenticated
  with check (user_id = auth.uid());

create policy beans_update_own on public.beans
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy beans_delete_own on public.beans
  for delete to authenticated
  using (user_id = auth.uid());

-- brews
create policy brews_select_own on public.brews
  for select to authenticated
  using (user_id = auth.uid());

create policy brews_insert_own on public.brews
  for insert to authenticated
  with check (user_id = auth.uid());

create policy brews_update_own on public.brews
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy brews_delete_own on public.brews
  for delete to authenticated
  using (user_id = auth.uid());

-- tag_suggestions：本人可讀、可提交；審核（update status）由 service_role 繞過 RLS 處理，Phase 1 不開使用者端 update/delete
create policy tag_suggestions_select_own on public.tag_suggestions
  for select to authenticated
  using (user_id = auth.uid());

create policy tag_suggestions_insert_own on public.tag_suggestions
  for insert to authenticated
  with check (user_id = auth.uid());
