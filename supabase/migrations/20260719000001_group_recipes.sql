-- FR-14.5～14.8 群組配方：成員把個人配方「推薦給群組」＝快照複製一份
-- pending（個人原件保留、兩邊獨立演化），經群組管理者（建立者＋副組長）
-- 核可後成為群組配方；已核可配方由建立者管理。權限矩陣與群組器材
-- （FR-10.9b＋FR-10.12 終態）一字不差：
--   個人配方（group_id null）  ：本人 CRUD，status 恆 approved
--   群組配方 pending           ：提交者可撤回；管理者可核可（update status）或退回（delete）
--   群組配方 approved          ：僅建立者可編輯/刪除；全員可見可載入
-- 解散群組：group_id set null → 退回推薦者的個人配方（trigger 正規化
-- status 並處理與既有個人配方的撞名）。

alter table public.recipes
  add column group_id uuid references public.groups (id) on delete set null,
  add column status text not null default 'approved'
    check (status in ('pending', 'approved'));

create index idx_recipes_group on public.recipes (group_id)
  where (group_id is not null);

-- 名稱唯一改分層：個人層帳號內唯一、群組層群組內唯一（含 pending，
-- 提案撞名直接在送出時擋下，核可時不會再撞）
alter table public.recipes drop constraint recipes_user_id_name_key;
create unique index uq_recipes_personal_name
  on public.recipes (user_id, name) where (group_id is null);
create unique index uq_recipes_group_name
  on public.recipes (group_id, name) where (group_id is not null);

-- 解散群組（FK set null 觸發 update）→ 回歸個人配方：
-- status 正規化為 approved；與既有個人配方撞名時自動加序號
create or replace function public.recipes_normalize_on_ungroup()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  base text;
  candidate text;
  n int := 1;
begin
  if new.group_id is null and old.group_id is not null then
    new.status := 'approved';
    candidate := new.name;
    base := left(new.name, 50);
    while exists (
      select 1 from public.recipes r
      where r.user_id = new.user_id and r.group_id is null
        and r.name = candidate and r.id <> new.id
    ) loop
      n := n + 1;
      candidate := base || '（' || n || '）';
    end loop;
    new.name := candidate;
  end if;
  return new;
end;
$$;

create trigger trg_recipes_ungroup
  before update on public.recipes
  for each row execute function public.recipes_normalize_on_ungroup();

-- ============ RLS：改寫四政策（原為僅本人） ============

-- 讀：個人＝本人；群組＝成員可見 approved，pending 僅提交者與管理者可見
drop policy recipes_select on public.recipes;
create policy recipes_select on public.recipes
  for select to authenticated
  using (
    (group_id is null and user_id = auth.uid())
    or (
      group_id is not null
      and public.is_group_member(group_id)
      and (
        status = 'approved'
        or user_id = auth.uid()
        or public.is_group_manager(group_id)
      )
    )
  );

drop policy recipes_insert on public.recipes;
create policy recipes_insert on public.recipes
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

drop policy recipes_update on public.recipes;
create policy recipes_update on public.recipes
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

drop policy recipes_delete on public.recipes;
create policy recipes_delete on public.recipes
  for delete to authenticated
  using (
    (user_id = auth.uid() and (group_id is null or status = 'pending'))
    or (group_id is not null and public.is_group_owner(group_id))
    or (group_id is not null and status = 'pending'
        and public.is_group_manager(group_id))
  );
