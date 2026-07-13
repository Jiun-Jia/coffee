-- 器材清單（濾杯/濾紙/手沖壺）：設定頁維護、沖煮表單下拉選用。
-- 輕量設計：brews 的 dripper/filter/kettle 仍存文字（歷史紀錄不受影響、
-- 分析照舊以字串 distinct），本表僅作為使用者的可選清單（非 FK）。

create type public.equipment_kind as enum ('dripper', 'filter', 'kettle');

create table public.equipment (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       public.equipment_kind not null,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, name)
);

create index idx_equipment_user on public.equipment (user_id);

alter table public.equipment enable row level security;

-- 擁有者隔離（同 grinders：insert/update 皆需 with check）
create policy equipment_select on public.equipment
  for select to authenticated using (user_id = auth.uid());
create policy equipment_insert on public.equipment
  for insert to authenticated with check (user_id = auth.uid());
create policy equipment_update on public.equipment
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy equipment_delete on public.equipment
  for delete to authenticated using (user_id = auth.uid());

-- 表層 DML 權限由 20260709000001_grants.sql 的 default privileges 自動涵蓋
