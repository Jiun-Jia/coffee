-- FR-10.10 入群審核：邀請碼不再直接入群，改為「申請 → 建立者核可」。
-- 模型：列存在＝待審核（pending）；核可＝加入 group_members 並刪列（service_role）；
-- 退回＝建立者刪列（申請人可重新申請）；撤回＝申請人自刪。

create table public.group_join_requests (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, user_id) -- 同群重複申請擋 23505
);

create index idx_gjr_group on public.group_join_requests (group_id);

-- ============ Helpers（security definer 避免政策巢狀/遞迴） ============

-- 我對某群組有待審核的申請（供 groups select：申請人看得到群組名）
create or replace function public.has_pending_join_request(gid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_join_requests
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- 某使用者對「我建立的群組」有申請（供 profiles select：建立者看得到申請人名稱）
create or replace function public.requested_my_group(other uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_join_requests r
    join public.groups g on g.id = r.group_id
    where r.user_id = other and g.owner_id = auth.uid()
  );
$$;

-- ============ group_join_requests 政策 ============

alter table public.group_join_requests enable row level security;

-- 申請人看自己的；建立者看所轄群組的
create policy gjr_select on public.group_join_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_group_owner(group_id));

-- 申請人建立自己的申請（已是成員則擋；group_id 有效性靠 FK）
create policy gjr_insert on public.group_join_requests
  for insert to authenticated
  with check (user_id = auth.uid() and not public.is_group_member(group_id));

-- 申請人撤回、建立者退回（核可走 service_role：加成員＋刪列）
create policy gjr_delete on public.group_join_requests
  for delete to authenticated
  using (user_id = auth.uid() or public.is_group_owner(group_id));

-- ============ 既有政策擴寫 ============

-- groups：申請人可讀（顯示「申請中」的群組名；invite_code 對方本就持有）
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups
  for select to authenticated
  using (
    owner_id = auth.uid()
    or public.is_group_member(id)
    or public.has_pending_join_request(id)
  );

-- profiles：建立者可讀「申請加入我群組的人」的名稱（審核清單顯示用）
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.shares_group_with(id)
    or public.requested_my_group(id)
  );
