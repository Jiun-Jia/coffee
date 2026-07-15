-- FR-10.12 副群組長：建立者可指派成員為 admin，分擔「三種審核」
-- （入群申請、器材提案、標籤提交）。
-- 仍限建立者：解散群組、更換邀請碼、移除成員、指派/解除副組長、
-- 管理已生效項目（刪群組標籤、編輯/刪除已核可器材）。

alter table public.group_members add column role text not null default 'member'
  check (role in ('member', 'admin'));

-- 群組管理者（建立者或副組長）＝審核權限的統一判斷點
create or replace function public.is_group_manager(gid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.groups where id = gid and owner_id = auth.uid()
  )
  or exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid() and role = 'admin'
  );
$$;

-- 建立者指派/解除副組長（group_members 原無 update 政策）
create policy group_members_update on public.group_members
  for update to authenticated
  using (exists (
    select 1 from public.groups g
    where g.id = group_id and g.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.groups g
    where g.id = group_id and g.owner_id = auth.uid()
  ));

-- ============ 入群審核（FR-10.10）→ 管理者可審 ============

drop policy if exists gjr_select on public.group_join_requests;
create policy gjr_select on public.group_join_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_group_manager(group_id));

drop policy if exists gjr_delete on public.group_join_requests;
create policy gjr_delete on public.group_join_requests
  for delete to authenticated
  using (user_id = auth.uid() or public.is_group_manager(group_id));

-- 管理者需能讀申請人名稱
create or replace function public.requested_my_group(other uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_join_requests r
    where r.user_id = other and public.is_group_manager(r.group_id)
  );
$$;

-- ============ 標籤審核（FR-5.6）→ 管理者可審 ============

drop policy if exists tag_suggestions_select on public.tag_suggestions;
create policy tag_suggestions_select on public.tag_suggestions
  for select to authenticated
  using (user_id = auth.uid() or public.is_group_manager(group_id));

drop policy if exists tag_suggestions_update on public.tag_suggestions;
create policy tag_suggestions_update on public.tag_suggestions
  for update to authenticated
  using (public.is_group_manager(group_id))
  with check (public.is_group_manager(group_id));

-- 群組標籤建立（核可時 insert）開放管理者；刪除仍限建立者
drop policy if exists flavor_tags_insert on public.flavor_tags;
create policy flavor_tags_insert on public.flavor_tags
  for insert to authenticated
  with check (
    (scope = 'user' and owner_user_id = auth.uid() and group_id is null)
    or (
      scope = 'group'
      and owner_user_id = auth.uid()
      and public.is_group_manager(group_id)
    )
  );

-- ============ 器材審核（FR-10.9b）→ 管理者可審 pending ============
-- 管理者只能動 pending 列（using 限定）；已核可器材的編輯/刪除仍限建立者。
-- 管理者自己新增的器材直接生效（等同自案自核）。

drop policy if exists grinders_insert on public.grinders;
create policy grinders_insert on public.grinders
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      (group_id is null and status = 'approved')
      or (
        group_id is not null
        and public.is_group_member(group_id)
        and (status = 'pending' or public.is_group_manager(group_id))
      )
    )
  );

drop policy if exists equipment_insert on public.equipment;
create policy equipment_insert on public.equipment
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      (group_id is null and status = 'approved')
      or (
        group_id is not null
        and public.is_group_member(group_id)
        and (status = 'pending' or public.is_group_manager(group_id))
      )
    )
  );

drop policy if exists grinders_update on public.grinders;
create policy grinders_update on public.grinders
  for update to authenticated
  using (
    (user_id = auth.uid() and (group_id is null or status = 'pending'))
    or (group_id is not null and public.is_group_owner(group_id))
    or (group_id is not null and status = 'pending'
        and public.is_group_manager(group_id))
  )
  with check (
    (group_id is null and user_id = auth.uid() and status = 'approved')
    or (
      group_id is not null
      and (
        public.is_group_owner(group_id)
        or (user_id = auth.uid() and status = 'pending') -- 一般成員不可自核
        or public.is_group_manager(group_id)
      )
    )
  );

drop policy if exists grinders_delete on public.grinders;
create policy grinders_delete on public.grinders
  for delete to authenticated
  using (
    (user_id = auth.uid() and (group_id is null or status = 'pending'))
    or (group_id is not null and public.is_group_owner(group_id))
    or (group_id is not null and status = 'pending'
        and public.is_group_manager(group_id))
  );

drop policy if exists equipment_update on public.equipment;
create policy equipment_update on public.equipment
  for update to authenticated
  using (
    (user_id = auth.uid() and (group_id is null or status = 'pending'))
    or (group_id is not null and public.is_group_owner(group_id))
    or (group_id is not null and status = 'pending'
        and public.is_group_manager(group_id))
  )
  with check (
    (group_id is null and user_id = auth.uid() and status = 'approved')
    or (
      group_id is not null
      and (
        public.is_group_owner(group_id)
        or (user_id = auth.uid() and status = 'pending')
        or public.is_group_manager(group_id)
      )
    )
  );

drop policy if exists equipment_delete on public.equipment;
create policy equipment_delete on public.equipment
  for delete to authenticated
  using (
    (user_id = auth.uid() and (group_id is null or status = 'pending'))
    or (group_id is not null and public.is_group_owner(group_id))
    or (group_id is not null and status = 'pending'
        and public.is_group_manager(group_id))
  );
