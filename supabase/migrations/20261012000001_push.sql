-- ─────────────────────────────────────────────────────────────
-- התראות פוש
-- כל מכשיר שהמשתמש אישר בו התראות: דפדפן (Web Push, kind = 'web') או
-- אפליקציית האנדרואיד (Firebase, kind = 'fcm'). השרת שולח דרך המפתח הסודי,
-- והמשתמש רואה ומוחק רק את המכשירים שלו.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('web', 'fcm')),
  endpoint     text not null unique check (char_length(endpoint) <= 1000), -- web: כתובת; fcm: טוקן
  p256dh       text check (char_length(p256dh) <= 200),
  auth         text check (char_length(auth) <= 100),
  user_agent   text check (char_length(user_agent) <= 300),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_select_own on public.push_subscriptions;
create policy push_select_own on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
drop policy if exists push_delete_own on public.push_subscriptions;
create policy push_delete_own on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

revoke insert, update on public.push_subscriptions from anon, authenticated;

-- סוף חלק 1

-- שמירת מכשיר. אותו מכשיר שעבר למשתמש אחר (התחברות בחשבון אחר) עובר אליו.
-- עד 10 מכשירים למשתמש; הישן ביותר נמחק.
create or replace function public.save_push_subscription(
  p_kind       text,
  p_endpoint   text,
  p_p256dh     text default null,
  p_auth       text default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid and status = 'active' and deleted_at is null) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_kind not in ('web', 'fcm') or nullif(trim(p_endpoint), '') is null
     or (p_kind = 'web' and (p_endpoint not like 'https://%' or p_p256dh is null or p_auth is null)) then
    raise exception 'invalid subscription' using errcode = '22023';
  end if;

  insert into public.push_subscriptions (user_id, kind, endpoint, p256dh, auth, user_agent)
  values (v_uid, p_kind, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = v_uid, kind = excluded.kind, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, last_seen_at = now();

  delete from public.push_subscriptions
  where user_id = v_uid and id not in (
    select id from public.push_subscriptions where user_id = v_uid order by last_seen_at desc limit 10
  );
end;
$$;
revoke execute on function public.save_push_subscription(text, text, text, text, text) from public;
grant execute on function public.save_push_subscription(text, text, text, text, text) to authenticated;

-- סוף חלק 2
