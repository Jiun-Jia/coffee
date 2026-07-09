-- profiles：使用者公開資料（DESIGN §A.3 的 users，依 Supabase 慣例改名）。
-- 決策 D4：不存 email（避免與 auth.users 同步問題，需要時 join auth 取得）。
-- 決策 D2：username 3–20 字元、小寫英數與 _-；大小寫不敏感唯一（正規化為小寫 + lower unique index 雙保險）。

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_profiles_username_lower on public.profiles (lower(username));

-- 共用的 updated_at trigger function（後續各表沿用）
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 註冊時由 auth.users 同步建立 profile（AUTH-4 於 signUp 的 metadata 帶入 username）。
-- 任何 raise 都會讓整個註冊失敗（Supabase 回籠統 500），故先做完整驗證：
-- 前端先以 AUTH-3 預檢，這裡的 unique index 是最後防線。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := lower(trim(new.raw_user_meta_data ->> 'username'));

  if v_username is null or v_username = '' then
    raise exception 'username is required in signup metadata';
  end if;

  if v_username !~ '^[a-z0-9_-]{3,20}$' then
    raise exception 'invalid username format';
  end if;

  insert into public.profiles (id, username) values (new.id, v_username);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
