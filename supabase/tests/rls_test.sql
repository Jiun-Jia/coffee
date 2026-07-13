-- RLS 隔離驗證（DB-12，NFR「後端層強制私有」的驗收關卡）。
-- 執行：pnpm db:test:rls（需本機 supabase start）
-- 全程包在 transaction 內並 rollback，可重複執行、不留資料。
-- 任何斷言失敗會 raise exception 中止（psql -v ON_ERROR_STOP=1 回非零 exit code）。

begin;

-- ============================================================
-- 準備：建立兩個測試使用者（觸發 handle_new_user 建 profiles）
-- ============================================================
insert into auth.users (
  id, instance_id, aud, role, email,
  raw_app_meta_data, raw_user_meta_data,
  encrypted_password, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-00000000000a',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'a@test.local',
    '{"provider":"email","providers":["email"]}', '{"username":"user_a"}',
    '', now(), now()
  ),
  (
    '00000000-0000-0000-0000-00000000000b',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'b@test.local',
    '{"provider":"email","providers":["email"]}', '{"username":"user_b"}',
    '', now(), now()
  );

-- trigger 應已建立兩筆 profiles（username 正規化為小寫）
do $$
declare n int;
begin
  select count(*) into n from public.profiles
  where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
  if n <> 2 then
    raise exception 'FAIL: handle_new_user 應建立 2 筆 profiles，實際 %', n;
  end if;
end $$;

-- 以 superuser 幫 A 建立測試資料（bean / grinder / brew / 自訂標籤 / 掛標籤）
insert into public.beans (id, user_id, roaster, name_batch, origin, roast_level, roast_date)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
        '測試烘豆所', 'Ethiopia Guji', '衣索比亞', 'medium_light', current_date - 12);

insert into public.grinders (id, user_id, name)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'C40');

insert into public.equipment (id, user_id, kind, name)
values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'dripper', 'V60-01');

insert into public.brews (id, user_id, bean_id, grinder_id, dose_g, water_g, overall)
values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
        '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 15, 240, 4);

insert into public.flavor_tags (id, name, category, scope, owner_user_id)
values ('40000000-0000-0000-0000-000000000001', '焦糖布丁', '其他', 'user',
        '00000000-0000-0000-0000-00000000000a');

insert into public.brew_flavor_tags (brew_id, tag_id)
values ('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001');

-- ============================================================
-- 1) 使用者 A：可讀寫自己的資料
-- ============================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from public.beans;
  if n <> 1 then raise exception 'FAIL: A 應看到 1 筆 bean，實際 %', n; end if;

  select count(*) into n from public.brew_details;
  if n <> 1 then raise exception 'FAIL: A 應在 brew_details 看到 1 筆，實際 %', n; end if;

  -- 衍生欄位口徑（rest_days = 12、ratio_value = 16.0）
  perform 1 from public.brew_details
  where id = '30000000-0000-0000-0000-000000000001'
    and rest_days = 12 and ratio_value = 16.0;
  if not found then raise exception 'FAIL: brew_details 衍生欄位 rest_days/ratio_value 不符'; end if;

  -- 可讀 system 標籤 + 自己的自訂標籤
  select count(*) into n from public.flavor_tags where scope = 'system';
  if n < 40 then raise exception 'FAIL: A 應看到 system 標籤（seed），實際 %', n; end if;
  select count(*) into n from public.flavor_tags where scope = 'user';
  if n <> 1 then raise exception 'FAIL: A 應看到自己的 1 筆自訂標籤，實際 %', n; end if;
end $$;

-- A 無法插入 user_id 為 B 的資料（with check 生效）
do $$
begin
  begin
    insert into public.beans (user_id, roaster, name_batch, origin, roast_level, roast_date)
    values ('00000000-0000-0000-0000-00000000000b', 'x', 'x', 'x', 'light', current_date);
    raise exception 'FAIL: A 不應能插入 user_id=B 的 bean';
  exception when insufficient_privilege or check_violation then
    null; -- 預期：RLS with check 拒絕（42501）
  end;
end $$;

-- A 無法建立 system 標籤
do $$
begin
  begin
    insert into public.flavor_tags (name, category, scope)
    values ('駭入標籤', '花香', 'system');
    raise exception 'FAIL: A 不應能建立 system 標籤';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;

reset role;

-- ============================================================
-- 2) 使用者 B：看不到、動不了 A 的任何資料
-- ============================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from public.beans;
  if n <> 0 then raise exception 'FAIL: B 應看到 0 筆 bean，實際 %', n; end if;

  select count(*) into n from public.brews;
  if n <> 0 then raise exception 'FAIL: B 應看到 0 筆 brew，實際 %', n; end if;

  select count(*) into n from public.brew_details;
  if n <> 0 then raise exception 'FAIL: B 在 brew_details 應看到 0 筆（security_invoker），實際 %', n; end if;

  select count(*) into n from public.grinders;
  if n <> 0 then raise exception 'FAIL: B 應看到 0 台磨豆機，實際 %', n; end if;

  select count(*) into n from public.equipment;
  if n <> 0 then raise exception 'FAIL: B 應看到 0 件器材，實際 %', n; end if;

  select count(*) into n from public.brew_flavor_tags;
  if n <> 0 then raise exception 'FAIL: B 應看到 0 筆掛標籤關聯，實際 %', n; end if;

  -- B 可讀 system 標籤，但看不到 A 的自訂標籤
  select count(*) into n from public.flavor_tags where scope = 'user';
  if n <> 0 then raise exception 'FAIL: B 不應看到 A 的自訂標籤，實際 %', n; end if;

  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'FAIL: B 應只看到自己的 profile，實際 %', n; end if;
end $$;

-- B 對 A 的 bean 做 update：RLS 下靜默 0 筆（應用層需檢查 affected rows）
do $$
declare n int;
begin
  update public.beans set roaster = '駭客' where id = '10000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B 不應能改到 A 的 bean（改到 % 筆）', n; end if;
end $$;

-- B 無法對 A 的 brew 掛標籤
do $$
begin
  begin
    insert into public.brew_flavor_tags (brew_id, tag_id)
    values ('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001');
    raise exception 'FAIL: B 不應能對 A 的 brew 掛標籤';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;

reset role;

-- ============================================================
-- 3) 匿名（anon）：全部 0 列
-- ============================================================
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
declare n int;
begin
  select count(*) into n from public.beans;
  if n <> 0 then raise exception 'FAIL: anon 應看到 0 筆 bean，實際 %', n; end if;
  select count(*) into n from public.flavor_tags;
  if n <> 0 then raise exception 'FAIL: anon 應看到 0 筆標籤（policy 僅 to authenticated），實際 %', n; end if;
  select count(*) into n from public.profiles;
  if n <> 0 then raise exception 'FAIL: anon 應看到 0 筆 profile，實際 %', n; end if;
end $$;

reset role;

-- ============================================================
-- 4) 刪豆 cascade：連帶刪 brews 與 brew_flavor_tags
-- ============================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

do $$
declare n int;
begin
  delete from public.beans where id = '10000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: A 應能刪除自己的 bean'; end if;

  select count(*) into n from public.brews;
  if n <> 0 then raise exception 'FAIL: 刪豆後 brews 應被 cascade 刪除，剩 %', n; end if;
end $$;

reset role;

do $$
declare n int;
begin
  -- superuser 視角確認 junction 也被清掉（只算測試資料，DB 可能有真實使用者資料）
  select count(*) into n from public.brew_flavor_tags
  where brew_id = '30000000-0000-0000-0000-000000000001';
  if n <> 0 then raise exception 'FAIL: 刪豆後 brew_flavor_tags 應為空，剩 %', n; end if;
end $$;

-- ============================================================
-- 5) FR-10 群組共豆：A 建群組拉 C 入群，B 仍被隔離
-- ============================================================
insert into auth.users (
  id, instance_id, aud, role, email,
  raw_app_meta_data, raw_user_meta_data,
  encrypted_password, created_at, updated_at
) values (
  '00000000-0000-0000-0000-00000000000c',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'c@test.local',
  '{"provider":"email","providers":["email"]}', '{"username":"user_c"}',
  '', now(), now()
);

insert into public.groups (id, name, owner_id, invite_code)
values ('60000000-0000-0000-0000-000000000001', '咖啡同好會',
        '00000000-0000-0000-0000-00000000000a', 'TESTCODE');
insert into public.group_members (group_id, user_id) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a'),
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c');

-- A 的群組豆 + A 在群組豆上的沖煮（掛 A 的自訂標籤）
insert into public.beans (id, user_id, group_id, roaster, name_batch, origin, roast_level, roast_date)
values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a',
        '60000000-0000-0000-0000-000000000001',
        '測試烘豆所', 'Group Gesha', '巴拿馬', 'light', current_date - 7);
insert into public.brews (id, user_id, bean_id, dose_g, water_g, overall)
values ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a',
        '10000000-0000-0000-0000-000000000002', 15, 225, 5);
insert into public.flavor_tags (id, name, category, scope, owner_user_id)
values ('40000000-0000-0000-0000-000000000002', '茉莉花香', '自訂', 'user',
        '00000000-0000-0000-0000-00000000000a');
insert into public.brew_flavor_tags (brew_id, tag_id)
values ('30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002');

-- C（群組成員）視角
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

do $$
declare n int;
begin
  -- 看得到群組豆與 A 的沖煮（含 brew_details 的沖煮人名稱）
  select count(*) into n from public.beans where group_id is not null;
  if n <> 1 then raise exception 'FAIL: C 應看到 1 支群組豆，實際 %', n; end if;

  select count(*) into n from public.brews;
  if n <> 1 then raise exception 'FAIL: C 應看到群組豆上 A 的 1 筆沖煮，實際 %', n; end if;

  perform 1 from public.brew_details
  where id = '30000000-0000-0000-0000-000000000002' and brewer_username = 'user_a';
  if not found then raise exception 'FAIL: C 應在 brew_details 看到沖煮人 user_a'; end if;

  -- FR-10.6：看得到 A 掛的自訂標籤名稱
  select count(*) into n from public.flavor_tags where name = '茉莉花香';
  if n <> 1 then raise exception 'FAIL: C 應看到群組沖煮上的自訂標籤'; end if;

  -- 看不到 A 的「個人」豆（本測試中 A 的個人豆已於步驟 4 刪除，故總數應僅群組豆）
  select count(*) into n from public.beans;
  if n <> 1 then raise exception 'FAIL: C 只應看到群組豆，實際 %', n; end if;
end $$;

-- C 可對群組豆新增自己的沖煮
insert into public.brews (id, user_id, bean_id, dose_g, water_g, overall)
values ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000c',
        '10000000-0000-0000-0000-000000000002', 16, 240, 3);

-- FR-10.5：C 改不動 A 的沖煮（靜默 0 筆）
do $$
declare n int;
begin
  update public.brews set overall = 1 where id = '30000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: C 不應能改 A 的沖煮（改到 % 筆）', n; end if;
end $$;

-- FR-10.3：C（非豆子建立者）改不動、刪不掉群組豆
do $$
declare n int;
begin
  update public.beans set roaster = '駭客' where id = '10000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: C 不應能編輯群組豆'; end if;

  delete from public.beans where id = '10000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: C 不應能刪除群組豆'; end if;
end $$;

-- FR-10.3：C 不能刪群組（僅建立者）、但可自行退出
do $$
declare n int;
begin
  delete from public.groups where id = '60000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: C 不應能刪除群組'; end if;
end $$;

reset role;

-- B（非成員）視角：群組資料全部不可見
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from public.groups;
  if n <> 0 then raise exception 'FAIL: B 不應看到群組'; end if;
  select count(*) into n from public.beans;
  if n <> 0 then raise exception 'FAIL: B 不應看到群組豆'; end if;
  select count(*) into n from public.brews;
  if n <> 0 then raise exception 'FAIL: B 不應看到群組沖煮'; end if;

  -- B 不能對看不到的豆記沖煮（brews insert with check）
  begin
    insert into public.brews (user_id, bean_id, dose_g, water_g, overall)
    values ('00000000-0000-0000-0000-00000000000b',
            '10000000-0000-0000-0000-000000000002', 15, 240, 4);
    raise exception 'FAIL: B 不應能對群組豆記沖煮';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;

reset role;

-- A（建立者）可解散群組 → 群組豆回歸個人（set null）
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

do $$
declare n int;
begin
  delete from public.groups where id = '60000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: A（建立者）應能解散群組'; end if;

  perform 1 from public.beans
  where id = '10000000-0000-0000-0000-000000000002' and group_id is null;
  if not found then raise exception 'FAIL: 解散後群組豆應回歸個人（group_id = null）'; end if;
end $$;

reset role;

do $$
begin
  raise notice '=== RLS 隔離驗證全數通過（含 FR-10 群組） ===';
end $$;

rollback;
