-- FR-11 結構化注水分段（PRD Phase 2 提前實作）：
-- 每段記「結束時間點＋累積水量＋手法備註」（口徑照 PRD §4.2 原規格）。
-- 既有 brews.pour_notes 保留為整體手法備註。

create table public.brew_pours (
  id                 uuid primary key default gen_random_uuid(),
  brew_id            uuid not null references public.brews (id) on delete cascade,
  seq                int not null check (seq >= 1),
  end_time_sec       int check (end_time_sec >= 0),          -- 該段結束時間點（秒）
  cumulative_water_g numeric(6, 2) check (cumulative_water_g > 0), -- 累積水量
  note               text,                                    -- 該段手法（中心繞圈…）
  unique (brew_id, seq)
);

create index idx_brew_pours_brew on public.brew_pours (brew_id);

alter table public.brew_pours enable row level security;

-- 讀取跟著「看得到的沖煮」走（群組成員可見）；寫入僅沖煮本人
create policy brew_pours_select on public.brew_pours
  for select to authenticated
  using (exists (select 1 from public.brews b where b.id = brew_id));
create policy brew_pours_insert on public.brew_pours
  for insert to authenticated
  with check (exists (
    select 1 from public.brews b
    where b.id = brew_id and b.user_id = auth.uid()
  ));
create policy brew_pours_update on public.brew_pours
  for update to authenticated
  using (exists (
    select 1 from public.brews b
    where b.id = brew_id and b.user_id = auth.uid()
  ));
create policy brew_pours_delete on public.brew_pours
  for delete to authenticated
  using (exists (
    select 1 from public.brews b
    where b.id = brew_id and b.user_id = auth.uid()
  ));
