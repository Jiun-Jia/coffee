-- FR-5.6 改版（群組標籤與審核）＋ FR-10.9（器材/磨豆機共用）。
--
-- 標籤審核新流程：成員提交建議到「群組」→ 群組建立者核可 → 成為
-- scope='group' 的群組標籤（全體成員可選用）；建立者可直接建群組標籤免審。
-- 器材共用：grinders / equipment 加 group_id 歸屬（同 beans 模式），
-- 群組器材全員可選用、僅建立者可改刪。

-- ============ flavor_tags：group scope ============

alter table public.flavor_tags
  add column group_id uuid references public.groups (id) on delete cascade;

alter table public.flavor_tags drop constraint if exists flavor_tags_check;
alter table public.flavor_tags add constraint flavor_tags_check check (
  (scope = 'system' and owner_user_id is null and group_id is null)
  or (scope = 'user' and owner_user_id is not null and group_id is null)
  or (scope = 'group' and owner_user_id is not null and group_id is not null)
);

create unique index uq_tag_group
  on public.flavor_tags (group_id, name) where (scope = 'group');

drop policy if exists flavor_tags_select on public.flavor_tags;
create policy flavor_tags_select on public.flavor_tags
  for select to authenticated
  using (
    scope = 'system'
    or owner_user_id = auth.uid()
    or (scope = 'group' and public.is_group_member(group_id))
    or public.tag_on_visible_brew(id)
  );

-- 寫入：個人標籤本人；群組標籤僅群組建立者（核可或直建）
drop policy if exists tags_insert_own on public.flavor_tags;
create policy flavor_tags_insert on public.flavor_tags
  for insert to authenticated
  with check (
    (scope = 'user' and owner_user_id = auth.uid() and group_id is null)
    or (
      scope = 'group'
      and owner_user_id = auth.uid()
      and exists (
        select 1 from public.groups g
        where g.id = group_id and g.owner_id = auth.uid()
      )
    )
  );

drop policy if exists tags_update_own on public.flavor_tags;
create policy flavor_tags_update on public.flavor_tags
  for update to authenticated
  using (owner_user_id = auth.uid() and scope <> 'system')
  with check (owner_user_id = auth.uid() and scope <> 'system');

drop policy if exists tags_delete_own on public.flavor_tags;
create policy flavor_tags_delete on public.flavor_tags
  for delete to authenticated
  using (
    (scope = 'user' and owner_user_id = auth.uid())
    or (scope = 'group' and exists (
      select 1 from public.groups g
      where g.id = group_id and g.owner_id = auth.uid()
    ))
  );

-- ============ tag_suggestions：提交到群組、建立者可審 ============

alter table public.tag_suggestions
  add column group_id uuid references public.groups (id) on delete cascade;
-- 既有列（提交給舊的「系統內建」流程）group_id 為 null，僅存檔顯示

-- 群組建立者需能讀取/審核所轄群組的提交
drop policy if exists tag_suggestions_select_own on public.tag_suggestions;
create policy tag_suggestions_select on public.tag_suggestions
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.groups g
      where g.id = group_id and g.owner_id = auth.uid()
    )
  );

drop policy if exists tag_suggestions_insert_own on public.tag_suggestions;
create policy tag_suggestions_insert on public.tag_suggestions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and group_id is not null
    and public.is_group_member(group_id)
  );

create policy tag_suggestions_update on public.tag_suggestions
  for update to authenticated
  using (exists (
    select 1 from public.groups g
    where g.id = group_id and g.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.groups g
    where g.id = group_id and g.owner_id = auth.uid()
  ));

-- ============ grinders / equipment：群組歸屬（FR-10.9） ============

alter table public.grinders
  add column group_id uuid references public.groups (id) on delete set null;
alter table public.equipment
  add column group_id uuid references public.groups (id) on delete set null;

-- 讀取：本人的＋所屬群組的；寫入：僅本人，且歸屬只能是自己所在的群組
drop policy if exists grinders_select_own on public.grinders;
create policy grinders_select on public.grinders
  for select to authenticated
  using (
    user_id = auth.uid()
    or (group_id is not null and public.is_group_member(group_id))
  );
drop policy if exists grinders_insert_own on public.grinders;
create policy grinders_insert on public.grinders
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id))
  );
drop policy if exists grinders_update_own on public.grinders;
create policy grinders_update on public.grinders
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id))
  );
-- grinders_delete_own 不變（僅本人）

drop policy if exists equipment_select on public.equipment;
create policy equipment_select on public.equipment
  for select to authenticated
  using (
    user_id = auth.uid()
    or (group_id is not null and public.is_group_member(group_id))
  );
drop policy if exists equipment_insert on public.equipment;
create policy equipment_insert on public.equipment
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id))
  );
drop policy if exists equipment_update on public.equipment;
create policy equipment_update on public.equipment
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id))
  );
-- equipment_delete 不變（僅本人）
