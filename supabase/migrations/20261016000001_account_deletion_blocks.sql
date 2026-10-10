-- Kami — מחיקת חשבון עצמית וחסימת משתמשים (דרישות App Store 5.1.1(v) ו-1.2)
--
-- 1. מחיקת חשבון מתוך החשבון שלי: הפונקציה מאשרת (לא חבר/ת צוות) ורושמת; הפעולה בשרת
--    מוחקת אחר כך את משתמש ה-Auth, וזה מוחק בשרשרת את הפרופיל וכל מה שמפנה אליו.
-- 2. חסימה: משתמש מחביא אצלו את כל הביקורות של כותב/ת מסוים/ת. הצוות מקבל דיווח רגיל.

create table if not exists public.account_deletions (
  user_id    uuid primary key,
  deleted_at timestamptz not null default now()
);
alter table public.account_deletions enable row level security;
-- בלי מדיניות: רק פונקציות security definer וה-service role רואים את הטבלה.

create or replace function public.authorize_own_account_delete()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if exists (select 1 from public.staff_members where user_id = auth.uid()) then
    raise exception 'staff account' using errcode = '42501', hint = 'staff';
  end if;
  insert into public.account_deletions (user_id) values (auth.uid())
  on conflict (user_id) do update set deleted_at = now();
end;
$$;

revoke execute on function public.authorize_own_account_delete() from public, anon;
grant execute on function public.authorize_own_account_delete() to authenticated;

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;

drop policy if exists user_blocks_select_own on public.user_blocks;
create policy user_blocks_select_own on public.user_blocks
  for select to authenticated using (blocker_id = auth.uid());
drop policy if exists user_blocks_delete_own on public.user_blocks;
create policy user_blocks_delete_own on public.user_blocks
  for delete to authenticated using (blocker_id = auth.uid());
revoke insert, update on public.user_blocks from anon, authenticated;

-- חוסמים לפי ביקורת, כדי שמזהה הכותב/ת לא יגיע לדפדפן.
create or replace function public.block_review_author(p_review uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select user_id into v_author from public.reviews where id = p_review and status = 'published';
  if v_author is null then
    raise exception 'review not found' using errcode = 'P0002';
  end if;
  if v_author = auth.uid() then
    raise exception 'own review' using errcode = '22023', hint = 'own_review';
  end if;
  insert into public.user_blocks (blocker_id, blocked_id) values (auth.uid(), v_author)
  on conflict do nothing;
end;
$$;

revoke execute on function public.block_review_author(uuid) from public, anon;
grant execute on function public.block_review_author(uuid) to authenticated;
