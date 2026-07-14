-- FR-10.9b 群組器材審核制：成員把器材加進群組＝「提案」（pending），
-- 經群組建立者核可（approved）才會出現在成員的沖煮下拉；
-- 建立者自己新增則直接生效。既有資料（含個人器材）一律視為已核可（default）。
--
-- 權限矩陣：
--   個人器材（group_id null）：本人 CRUD，status 恆為 approved
--   群組器材 pending        ：提案人可改/撤回；建立者可核可（update status）或退回（delete）
--   群組器材 approved       ：僅群組建立者可編輯/刪除（核可後交由建立者管理，防提案後改名繞審）

create or replace function public.is_group_owner(gid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.groups where id = gid and owner_id = auth.uid()
  );
$$;

alter table public.grinders add column status text not null default 'approved'
  check (status in ('pending', 'approved'));
alter table public.equipment add column status text not null default 'approved'
  check (status in ('pending', 'approved'));

-- 群組內同名唯一（個人層靠既有 unique(user_id, …)；跨成員提案撞名在群組層擋）
create unique index uq_grinders_group_name
  on public.grinders (group_id, name) where (group_id is not null);
create unique index uq_equipment_group_name
  on public.equipment (group_id, kind, name) where (group_id is not null);

-- ============ grinders 政策 ============

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
        and (status = 'pending' or public.is_group_owner(group_id))
      )
    )
  );

drop policy if exists grinders_update on public.grinders;
create policy grinders_update on public.grinders
  for update to authenticated
  using (
    (user_id = auth.uid() and (group_id is null or status = 'pending'))
    or (group_id is not null and public.is_group_owner(group_id))
  )
  with check (
    (group_id is null and user_id = auth.uid() and status = 'approved')
    or (
      group_id is not null
      and (
        public.is_group_owner(group_id)
        or (user_id = auth.uid() and status = 'pending') -- 成員不可自核
      )
    )
  );

drop policy if exists grinders_delete_own on public.grinders;
create policy grinders_delete on public.grinders
  for delete to authenticated
  using (
    (user_id = auth.uid() and (group_id is null or status = 'pending'))
    or (group_id is not null and public.is_group_owner(group_id))
  );

-- ============ equipment 政策 ============

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
        and (status = 'pending' or public.is_group_owner(group_id))
      )
    )
  );

drop policy if exists equipment_update on public.equipment;
create policy equipment_update on public.equipment
  for update to authenticated
  using (
    (user_id = auth.uid() and (group_id is null or status = 'pending'))
    or (group_id is not null and public.is_group_owner(group_id))
  )
  with check (
    (group_id is null and user_id = auth.uid() and status = 'approved')
    or (
      group_id is not null
      and (
        public.is_group_owner(group_id)
        or (user_id = auth.uid() and status = 'pending')
      )
    )
  );

drop policy if exists equipment_delete on public.equipment;
create policy equipment_delete on public.equipment
  for delete to authenticated
  using (
    (user_id = auth.uid() and (group_id is null or status = 'pending'))
    or (group_id is not null and public.is_group_owner(group_id))
  );
