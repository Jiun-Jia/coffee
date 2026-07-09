-- flavor_tags：風味標籤（scope=system 內建 / scope=user 個人私有，FR-5）
-- tag_suggestions：提交建議加入內建的標籤（FR-5.6，Phase 1 由管理者於 Studio 手動審核）

create table public.flavor_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  scope tag_scope not null default 'user',
  owner_user_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (scope = 'system' and owner_user_id is null)
    or (scope = 'user' and owner_user_id is not null)
  )
);

-- system 標籤全域唯一；user 標籤個人範圍內唯一（同時是 seed 冪等寫入的依據）
create unique index uq_tag_system on public.flavor_tags (name) where scope = 'system';
create unique index uq_tag_user on public.flavor_tags (owner_user_id, name) where scope = 'user';

create table public.tag_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  category text,
  status suggestion_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index idx_tag_suggestions_user on public.tag_suggestions (user_id);
