-- FR-10 群組共豆：groups / group_members ＋ beans.group_id，
-- RLS 由「僅本人」擴為「本人或同群組成員（讀）」。
-- 權限矩陣（PRD FR-10.3/10.5）：
--   群組：僅建立者可刪除/改名/換邀請碼；成員可退出
--   群組豆：全體成員可見、可新增沖煮；編輯/刪除僅豆子建立者
--   沖煮：成員互相「可看不可改」

-- ============ 資料表 ============

create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique, -- FR-10.2：邀請碼制，重新產生即失效
  created_at  timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index idx_group_members_user on public.group_members (user_id);

-- 群組解散 → 群組豆回歸建立者的個人豆（set null）
alter table public.beans
  add column group_id uuid references public.groups (id) on delete set null;

create index idx_beans_group on public.beans (group_id);

-- ============ Helper（security definer 避免政策遞迴/巢狀 RLS 成本）============

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- 與某使用者共享至少一個群組（供 profiles 讀取政策：顯示沖煮人名稱）
create or replace function public.shares_group_with(other uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = other
  );
$$;

-- ============ groups / group_members 政策 ============

alter table public.groups enable row level security;

create policy groups_select on public.groups
  for select to authenticated
  using (owner_id = auth.uid() or public.is_group_member(id));
create policy groups_insert on public.groups
  for insert to authenticated with check (owner_id = auth.uid());
create policy groups_update on public.groups
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy groups_delete on public.groups
  for delete to authenticated using (owner_id = auth.uid());

alter table public.group_members enable row level security;

create policy group_members_select on public.group_members
  for select to authenticated using (public.is_group_member(group_id));
-- 建立者把自己加進成員（建立群組流程）；以邀請碼加入走 service_role（繞過 RLS）
create policy group_members_insert on public.group_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.groups g
      where g.id = group_id and g.owner_id = auth.uid()
    )
  );
-- 自行退出，或建立者移除成員
create policy group_members_delete on public.group_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.groups g
      where g.id = group_id and g.owner_id = auth.uid()
    )
  );

-- ============ 既有政策擴寫 ============

-- profiles：可讀同群組成員的名稱（沖煮人顯示，FR-10.5）
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));

-- beans：成員可讀群組豆；寫入僅本人且只能掛自己所屬的群組
drop policy if exists beans_select_own on public.beans;
create policy beans_select on public.beans
  for select to authenticated
  using (
    user_id = auth.uid()
    or (group_id is not null and public.is_group_member(group_id))
  );
drop policy if exists beans_insert_own on public.beans;
create policy beans_insert on public.beans
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id))
  );
drop policy if exists beans_update_own on public.beans;
create policy beans_update on public.beans
  for update to authenticated
  using (user_id = auth.uid()) -- FR-10.3：僅建立者可編輯
  with check (
    user_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id))
  );
-- beans_delete 不變（僅建立者）

-- brews：成員可讀群組豆下的所有沖煮；寫入僅本人且豆子必須對本人可見
drop policy if exists brews_select_own on public.brews;
create policy brews_select on public.brews
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.beans b
      where b.id = bean_id
        and b.group_id is not null
        and public.is_group_member(b.group_id)
    )
  );
drop policy if exists brews_insert_own on public.brews;
create policy brews_insert on public.brews
  for insert to authenticated
  with check (
    user_id = auth.uid()
    -- 子查詢受 beans RLS 過濾：只能對「自己看得到的豆」記沖煮
    and exists (select 1 from public.beans b where b.id = bean_id)
  );
drop policy if exists brews_update_own on public.brews;
create policy brews_update on public.brews
  for update to authenticated
  using (user_id = auth.uid()) -- FR-10.5：他人紀錄可看不可改
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.beans b where b.id = bean_id)
  );
-- brews_delete 不變（僅本人）

-- brew_flavor_tags：讀取跟著「看得到的沖煮」走（寫入政策不變：僅自己的 brew）
drop policy if exists bft_select on public.brew_flavor_tags;
create policy brew_flavor_tags_select on public.brew_flavor_tags
  for select to authenticated
  using (exists (select 1 from public.brews b where b.id = brew_id));

-- flavor_tags：FR-10.6 看得到沖煮就看得到其標籤名稱（唯讀；寫入政策不變）
drop policy if exists tags_select on public.flavor_tags;
create policy flavor_tags_select on public.flavor_tags
  for select to authenticated
  using (
    scope = 'system'
    or owner_user_id = auth.uid()
    or exists (
      select 1 from public.brew_flavor_tags bft
      where bft.tag_id = flavor_tags.id
      -- bft 的 select 政策已限定「看得到的沖煮」
    )
  );

-- ============ brew_details 加沖煮人 ============

-- left join：即使名稱因政策不可讀也不吞掉整列（brewer_username 為 null）。
-- create or replace 不允許改欄位順序（新增 group_id 在中段），需 drop 重建。
drop view if exists public.brew_details;
create view public.brew_details
with (security_invoker = true)
as
select
  b.*,
  bn.roaster,
  bn.name_batch,
  bn.origin,
  bn.varietal,
  bn.process,
  bn.roast_level,
  bn.roast_date,
  bn.group_id,
  ((b.brewed_at at time zone 'Asia/Taipei')::date - bn.roast_date) as rest_days,
  round(
    (
      b.water_g
      + case when b.ratio_include_ice then coalesce(b.ice_g, 0) else 0 end
    ) / b.dose_g,
    1
  ) as ratio_value,
  p.username as brewer_username
from public.brews b
join public.beans bn on bn.id = b.bean_id
left join public.profiles p on p.id = b.user_id;
