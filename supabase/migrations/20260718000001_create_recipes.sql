-- FR-14 沖煮配方（Recipe）：把某次沖煮的器材/變因/分段快照成可命名、
-- 可重複載入的配方（RCP-1）。
-- 快照獨立於來源沖煮（source_brew_id 僅供溯源，刪除來源不影響配方）；
-- 分段以 jsonb 陣列快照（[{end_time_sec, cumulative_water_g, note}]），
-- 不需逐段查詢故不開子表。
-- 數值 check 與 brews 對齊（lib/validations 以 DB 為單一事實來源）。

create table public.recipes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 60),
  source_brew_id    uuid references public.brews (id) on delete set null,
  brew_type         public.brew_type not null default 'pour_over',
  -- 器材（沖煮紀錄同款：存文字，磨豆機為 FK＋刻度文字）
  dripper           text,
  filter            text,
  kettle            text,
  grinder_id        uuid references public.grinders (id) on delete set null,
  grind_setting     text,
  -- 沖煮變因
  water_temp        int check (water_temp between 60 and 100),
  dose_g            numeric(6, 2) check (dose_g > 0),
  water_g           numeric(6, 2) check (water_g > 0),
  ice_g             numeric(6, 2) check (ice_g >= 0),
  ratio_include_ice boolean not null default false,
  bloom_water_g     numeric(6, 2) check (bloom_water_g >= 0),
  bloom_time_sec    int check (bloom_time_sec >= 0),
  total_time_sec    int check (total_time_sec >= 0),
  pour_notes        text,
  pours             jsonb not null default '[]'::jsonb
                      check (jsonb_typeof(pours) = 'array'),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- 配方名稱在帳號內不重複（同 grinders 慣例）
  unique (user_id, name)
);

create index idx_recipes_user on public.recipes (user_id);

create trigger trg_recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

alter table public.recipes enable row level security;

-- 配方為個人私有（FR-14.4）：四種操作一律僅本人
create policy recipes_select on public.recipes
  for select to authenticated
  using (user_id = auth.uid());
create policy recipes_insert on public.recipes
  for insert to authenticated
  with check (user_id = auth.uid());
create policy recipes_update on public.recipes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy recipes_delete on public.recipes
  for delete to authenticated
  using (user_id = auth.uid());
