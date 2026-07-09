-- RLS：風味標籤兩表（FR-5，DESIGN §A.6）

alter table public.flavor_tags enable row level security;
alter table public.brew_flavor_tags enable row level security;

-- flavor_tags：可讀 system + 自己的；只能建立/修改/刪除自己的 user 標籤
-- （system 標籤僅 service_role 維護，使用者無法自建 scope='system'）
create policy tags_select on public.flavor_tags
  for select to authenticated
  using (scope = 'system' or owner_user_id = auth.uid());

create policy tags_insert_own on public.flavor_tags
  for insert to authenticated
  with check (scope = 'user' and owner_user_id = auth.uid());

create policy tags_update_own on public.flavor_tags
  for update to authenticated
  using (scope = 'user' and owner_user_id = auth.uid())
  with check (scope = 'user' and owner_user_id = auth.uid());

create policy tags_delete_own on public.flavor_tags
  for delete to authenticated
  using (scope = 'user' and owner_user_id = auth.uid());

-- brew_flavor_tags：無 user_id 欄位，一律透過所屬 brew 的擁有者判定；
-- insert 另要求 tag 本身可見（system 或本人的），避免掛上他人私有標籤。
create policy bft_select on public.brew_flavor_tags
  for select to authenticated
  using (
    exists (
      select 1 from public.brews b
      where b.id = brew_id and b.user_id = auth.uid()
    )
  );

create policy bft_insert on public.brew_flavor_tags
  for insert to authenticated
  with check (
    exists (
      select 1 from public.brews b
      where b.id = brew_id and b.user_id = auth.uid()
    )
    and exists (
      select 1 from public.flavor_tags t
      where t.id = tag_id
        and (t.scope = 'system' or t.owner_user_id = auth.uid())
    )
  );

create policy bft_delete on public.brew_flavor_tags
  for delete to authenticated
  using (
    exists (
      select 1 from public.brews b
      where b.id = brew_id and b.user_id = auth.uid()
    )
  );
