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

-- FR-11 注水分段：C 可讀 A 的分段、不可替 A 的沖煮寫分段
reset role;
insert into public.brew_pours (brew_id, seq, end_time_sec, cumulative_water_g, note)
values ('30000000-0000-0000-0000-000000000002', 1, 30, 60, '悶蒸');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from public.brew_pours
  where brew_id = '30000000-0000-0000-0000-000000000002';
  if n <> 1 then raise exception 'FAIL: C 應能讀 A 群組沖煮的分段'; end if;

  begin
    insert into public.brew_pours (brew_id, seq, end_time_sec)
    values ('30000000-0000-0000-0000-000000000002', 2, 60);
    raise exception 'FAIL: C 不應能替 A 的沖煮寫分段';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;

-- FR-5.6 群組標籤：C（非建立者）不能直建群組標籤、可提交建議
do $$
begin
  begin
    insert into public.flavor_tags (name, category, scope, owner_user_id, group_id)
    values ('偷渡群組標籤', '自訂', 'group',
            '00000000-0000-0000-0000-00000000000c',
            '60000000-0000-0000-0000-000000000001');
    raise exception 'FAIL: 非建立者不應能直建群組標籤';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;

insert into public.tag_suggestions (id, user_id, name, group_id)
values ('70000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-00000000000c', '烏龍茶感',
        '60000000-0000-0000-0000-000000000001');

reset role;

-- A（建立者）看得到 C 的提交、核可後建立群組標籤，C 看得到該標籤
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from public.tag_suggestions
  where id = '70000000-0000-0000-0000-000000000001';
  if n <> 1 then raise exception 'FAIL: 建立者應看到成員的標籤提交'; end if;
end $$;

update public.tag_suggestions set status = 'approved'
where id = '70000000-0000-0000-0000-000000000001';

insert into public.flavor_tags (name, category, scope, owner_user_id, group_id)
values ('烏龍茶感', '群組', 'group', '00000000-0000-0000-0000-00000000000a',
        '60000000-0000-0000-0000-000000000001');

-- FR-10.9 共用器材：A 建群組磨豆機
insert into public.grinders (id, user_id, group_id, name)
values ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a',
        '60000000-0000-0000-0000-000000000001', '群組共用 C40');

reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from public.flavor_tags where name = '烏龍茶感';
  if n <> 1 then raise exception 'FAIL: C 應看到核可後的群組標籤'; end if;

  select count(*) into n from public.grinders
  where id = '20000000-0000-0000-0000-000000000002';
  if n <> 1 then raise exception 'FAIL: C 應看到群組共用磨豆機'; end if;

  -- C 改不動 A 建的群組磨豆機
  update public.grinders set name = '駭客改名'
  where id = '20000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: C 不應能改群組磨豆機'; end if;
end $$;

-- FR-10.9b 器材審核：成員只能提案（pending）且不能自核；建立者核可後交其管理
do $$
begin
  -- A（建立者）直建的群組磨豆機預設即生效
  perform 1 from public.grinders
  where id = '20000000-0000-0000-0000-000000000002' and status = 'approved';
  if not found then raise exception 'FAIL: 建立者直建的群組磨豆機應為 approved'; end if;

  -- C 直插 approved 的群組器材應被拒
  begin
    insert into public.equipment (user_id, group_id, kind, name, status)
    values ('00000000-0000-0000-0000-00000000000c',
            '60000000-0000-0000-0000-000000000001', 'dripper', '偷渡濾杯', 'approved');
    raise exception 'FAIL: 成員不應能直插 approved 的群組器材';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;

-- C 提案（pending）成功
insert into public.equipment (id, user_id, group_id, kind, name, status)
values ('80000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-00000000000c',
        '60000000-0000-0000-0000-000000000001', 'dripper', '提案濾杯', 'pending');

-- C 不能自核（update status → with check 拒絕）
do $$
begin
  begin
    update public.equipment set status = 'approved'
    where id = '80000000-0000-0000-0000-000000000001';
    raise exception 'FAIL: 成員不應能自行核可提案';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;

-- C 再提案一件並自行撤回（pending 可自刪）
insert into public.equipment (id, user_id, group_id, kind, name, status)
values ('80000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-00000000000c',
        '60000000-0000-0000-0000-000000000001', 'kettle', '提案手沖壺', 'pending');

do $$
declare n int;
begin
  delete from public.equipment where id = '80000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: 提案人應能撤回自己的 pending 提案'; end if;
end $$;

reset role;

-- A（建立者）核可 C 的提案
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

do $$
declare n int;
begin
  update public.equipment set status = 'approved'
  where id = '80000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: 建立者應能核可成員的器材提案'; end if;
end $$;

reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

-- 核可後提案人（非建立者）不可再刪（交由建立者管理）
do $$
declare n int;
begin
  delete from public.equipment where id = '80000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: 核可後成員不應能刪除群組器材'; end if;
end $$;

reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

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

-- ============================================================
-- 5b) FR-10.10 入群審核：申請 → 建立者核可/退回
-- ============================================================

-- B 不能直接把自己塞進 group_members（必須走申請）
do $$
begin
  begin
    insert into public.group_members (group_id, user_id)
    values ('60000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-00000000000b');
    raise exception 'FAIL: B 不應能直接加入 group_members';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;

-- B 送出入群申請成功，且申請後看得到群組名稱（僅名稱，豆/沖煮仍不可見）
insert into public.group_join_requests (id, group_id, user_id)
values ('90000000-0000-0000-0000-000000000001',
        '60000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-00000000000b');

do $$
declare n int;
begin
  select count(*) into n from public.groups
  where id = '60000000-0000-0000-0000-000000000001';
  if n <> 1 then raise exception 'FAIL: 申請人應看得到群組名稱'; end if;

  select count(*) into n from public.beans;
  if n <> 0 then raise exception 'FAIL: 申請中仍不應看到群組豆'; end if;
end $$;

reset role;

-- C（成員但非建立者）看不到 B 的申請；也不能對自己已在的群組再申請
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from public.group_join_requests;
  if n <> 0 then raise exception 'FAIL: 非建立者成員不應看到入群申請'; end if;

  begin
    insert into public.group_join_requests (group_id, user_id)
    values ('60000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-00000000000c');
    raise exception 'FAIL: 已是成員不應能再申請';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;

reset role;

-- A（建立者）看得到 B 的申請與其名稱，可退回（刪除）
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from public.group_join_requests
  where id = '90000000-0000-0000-0000-000000000001';
  if n <> 1 then raise exception 'FAIL: 建立者應看到入群申請'; end if;

  select count(*) into n from public.profiles
  where id = '00000000-0000-0000-0000-00000000000b';
  if n <> 1 then raise exception 'FAIL: 建立者應能讀申請人名稱'; end if;

  delete from public.group_join_requests
  where id = '90000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: 建立者應能退回入群申請'; end if;
end $$;

reset role;

-- B 重新申請後可自行撤回
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

insert into public.group_join_requests (id, group_id, user_id)
values ('90000000-0000-0000-0000-000000000002',
        '60000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-00000000000b');

do $$
declare n int;
begin
  delete from public.group_join_requests
  where id = '90000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: 申請人應能撤回自己的申請'; end if;
end $$;

reset role;

-- ============================================================
-- 5c) FR-10.12 副群組長：三種審核可、管理已生效項目不可
-- ============================================================

-- C（一般成員）不能自封副組長（update 政策限建立者 → 0 筆）
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

do $$
declare n int;
begin
  update public.group_members set role = 'admin'
  where group_id = '60000000-0000-0000-0000-000000000001'
    and user_id = '00000000-0000-0000-0000-00000000000c';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: 非建立者不應能指派副組長'; end if;
end $$;

reset role;

-- A（建立者）指派 C 為副組長
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

do $$
declare n int;
begin
  update public.group_members set role = 'admin'
  where group_id = '60000000-0000-0000-0000-000000000001'
    and user_id = '00000000-0000-0000-0000-00000000000c';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: 建立者應能指派副組長'; end if;
end $$;

reset role;

-- B 再送一筆入群申請、superuser 補一筆 pending 器材提案（供副組長審核）
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

insert into public.group_join_requests (id, group_id, user_id)
values ('90000000-0000-0000-0000-000000000003',
        '60000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-00000000000b');

reset role;

insert into public.equipment (id, user_id, group_id, kind, name, status)
values ('80000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-00000000000a',
        '60000000-0000-0000-0000-000000000001', 'dripper', '成員提案濾杯', 'pending');

-- C（副組長）視角
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

do $$
declare n int;
begin
  -- 看得到入群申請與申請人名稱
  select count(*) into n from public.group_join_requests
  where id = '90000000-0000-0000-0000-000000000003';
  if n <> 1 then raise exception 'FAIL: 副組長應看到入群申請'; end if;

  select count(*) into n from public.profiles
  where id = '00000000-0000-0000-0000-00000000000b';
  if n <> 1 then raise exception 'FAIL: 副組長應能讀申請人名稱'; end if;

  -- 可退回入群申請
  delete from public.group_join_requests
  where id = '90000000-0000-0000-0000-000000000003';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: 副組長應能退回入群申請'; end if;

  -- 可核可器材提案
  update public.equipment set status = 'approved'
  where id = '80000000-0000-0000-0000-000000000004';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: 副組長應能核可器材提案'; end if;

  -- 不可刪除已核可器材（管理權仍在建立者）
  delete from public.equipment where id = '80000000-0000-0000-0000-000000000004';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: 副組長不應能刪除已核可器材'; end if;

  -- 不可刪群組標籤（管理權仍在建立者）
  delete from public.flavor_tags where name = '烏龍茶感' and scope = 'group';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: 副組長不應能刪群組標籤'; end if;
end $$;

-- 副組長可審核標籤提交（自己提交自己核可）並建立群組標籤
insert into public.tag_suggestions (id, user_id, name, group_id)
values ('70000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-00000000000c', '副組長茶香',
        '60000000-0000-0000-0000-000000000001');

do $$
declare n int;
begin
  update public.tag_suggestions set status = 'approved'
  where id = '70000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: 副組長應能審核標籤提交'; end if;
end $$;

insert into public.flavor_tags (name, category, scope, owner_user_id, group_id)
values ('副組長茶香', '群組', 'group',
        '00000000-0000-0000-0000-00000000000c',
        '60000000-0000-0000-0000-000000000001');

reset role;

-- A（建立者）可解散群組 → 群組豆回歸個人（set null）
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

do $$
declare n int;
begin
  -- FR-10.9b：建立者可刪除已核可的群組器材（含成員提案的）
  delete from public.equipment where id = '80000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: 建立者應能刪除已核可的群組器材'; end if;

  delete from public.groups where id = '60000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: A（建立者）應能解散群組'; end if;

  perform 1 from public.beans
  where id = '10000000-0000-0000-0000-000000000002' and group_id is null;
  if not found then raise exception 'FAIL: 解散後群組豆應回歸個人（group_id = null）'; end if;
end $$;

reset role;

-- ============================================================
-- FR-14 配方（recipes）：個人私有，四種操作僅本人（RCP-1）
-- ============================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

do $$
declare n int;
begin
  insert into public.recipes (user_id, name, dose_g, water_g, pours)
  values ('00000000-0000-0000-0000-00000000000a', '四六沖法', 20, 300,
          '[{"end_time_sec":45,"cumulative_water_g":60,"note":"悶蒸"}]');

  select count(*) into n from public.recipes;
  if n <> 1 then raise exception 'FAIL: A 應看到自己的 1 個配方，實際 %', n; end if;
end $$;

-- A 無法建立 user_id=B 的配方（with check 生效）
do $$
begin
  begin
    insert into public.recipes (user_id, name)
    values ('00000000-0000-0000-0000-00000000000b', '駭入配方');
    raise exception 'FAIL: A 不應能建立 user_id=B 的配方';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;

reset role;

-- B 看不到、動不了 A 的配方
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from public.recipes;
  if n <> 0 then raise exception 'FAIL: B 應看到 0 個配方，實際 %', n; end if;

  update public.recipes set name = '偷改'
  where user_id = '00000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B 不應能改 A 的配方'; end if;

  delete from public.recipes
  where user_id = '00000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B 不應能刪 A 的配方'; end if;
end $$;

reset role;

do $$
begin
  raise notice '=== RLS 隔離驗證全數通過（含 FR-10 群組、FR-14 配方） ===';
end $$;

rollback;
