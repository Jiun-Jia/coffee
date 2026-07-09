-- grinders：磨豆機（FR-3.9 刻度綁定、FR-3.10 使用者維護清單）
-- beans：一包豆子（PRD §7.1）
-- 決策 D5：兩表皆含 updated_at。

create table public.grinders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  burr_type text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name) -- 同帳號內名稱不重複（BEAN-7 捕捉 23505）
);

create index idx_grinders_user on public.grinders (user_id);

create trigger trg_grinders_updated_at
  before update on public.grinders
  for each row execute function public.set_updated_at();

create table public.beans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  roaster text not null,
  name_batch text not null,
  origin text not null,
  varietal text,
  process text,
  altitude text,
  farm text,
  roast_level roast_level not null,
  roast_date date not null,
  agtron int, -- Phase 2 預留
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_beans_user on public.beans (user_id);

create trigger trg_beans_updated_at
  before update on public.beans
  for each row execute function public.set_updated_at();
