-- 修正 FR-10.6 的政策循環：
-- bft 的 insert 政策查 flavor_tags → flavor_tags 讀取政策查 bft
-- → infinite recursion。以 security definer helper 打斷循環
-- （函式內繞過 RLS、手動實作「沖煮對本人可見」的判斷）。

create or replace function public.tag_on_visible_brew(tid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.brew_flavor_tags bft
    join public.brews b on b.id = bft.brew_id
    left join public.beans bn on bn.id = b.bean_id
    where bft.tag_id = tid
      and (
        b.user_id = auth.uid()
        or (bn.group_id is not null and public.is_group_member(bn.group_id))
      )
  );
$$;

drop policy if exists flavor_tags_select on public.flavor_tags;
create policy flavor_tags_select on public.flavor_tags
  for select to authenticated
  using (
    scope = 'system'
    or owner_user_id = auth.uid()
    or public.tag_on_visible_brew(id)
  );
