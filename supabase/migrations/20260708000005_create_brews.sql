-- brews：單次沖煮（PRD §7.3）
-- bean_id on delete cascade：刪豆連帶刪沖煮（FR-2.3）
-- grinder_id on delete set null：刪磨豆機保留沖煮、失去綁定（FR-3.9）
-- 時間欄位一律存秒數（Q4）；check 上下界與 lib/validations 對齊。

create table public.brews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  bean_id uuid not null references public.beans (id) on delete cascade,
  brew_type brew_type not null default 'pour_over',
  brewed_at timestamptz not null default now(),
  -- 器材
  dripper text,
  filter text,
  grinder_id uuid references public.grinders (id) on delete set null,
  grind_setting text,
  kettle text,
  -- 沖煮變因
  water_temp int check (water_temp between 60 and 100),
  dose_g numeric(6, 2) not null check (dose_g > 0),
  water_g numeric(6, 2) not null check (water_g > 0),
  ice_g numeric(6, 2) check (ice_g >= 0),
  ratio_include_ice boolean not null default false,
  bloom_water_g numeric(6, 2) check (bloom_water_g >= 0),
  bloom_time_sec int check (bloom_time_sec >= 0),
  pour_notes text,
  total_time_sec int check (total_time_sec >= 0),
  -- 感官評分 1–5（整體喜好度必填）
  aroma int check (aroma between 1 and 5),
  acidity int check (acidity between 1 and 5),
  sweetness int check (sweetness between 1 and 5),
  bitterness int check (bitterness between 1 and 5),
  body int check (body between 1 and 5),
  balance int check (balance between 1 and 5),
  aftertaste int check (aftertaste between 1 and 5),
  overall int not null check (overall between 1 and 5),
  -- 風味與備註
  flavor_notes text,
  next_adjustment text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_brews_user on public.brews (user_id);
create index idx_brews_bean on public.brews (bean_id);
create index idx_brews_grinder on public.brews (grinder_id);
create index idx_brews_brewed_at on public.brews (brewed_at desc);

create trigger trg_brews_updated_at
  before update on public.brews
  for each row execute function public.set_updated_at();

-- 沖煮 × 風味標籤（多對多）
create table public.brew_flavor_tags (
  brew_id uuid not null references public.brews (id) on delete cascade,
  tag_id uuid not null references public.flavor_tags (id) on delete cascade,
  primary key (brew_id, tag_id)
);

create index idx_bft_tag on public.brew_flavor_tags (tag_id);
