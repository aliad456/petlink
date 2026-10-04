-- Kami — המרה להרשמה
--
-- 1. אישור מייל "מאוחר": אחרי ההרשמה נכנסים מיד (ב-Supabase: Confirm email כבוי),
--    והמייל מאושר בקישור שנשלח (Magic Link). email_verified_at מסומן רק כשההתחברות
--    עצמה מוכיחה בעלות על המייל: קישור במייל, איפוס סיסמה או גוגל (amr בטוקן).
--    כתיבת ביקורת דורשת מייל מאושר.
-- 2. הרשמה עם גוגל: המייל כבר מאומת אצל גוגל; ההסכמה לתנאים נשמרת אחרי החזרה.
-- 3. מקור ההרשמה (לב, כרטיס חיה, ביקורת…) ושיטה (מייל / גוגל) — למשפך בדשבורד.
-- 4. תזכורות חיסון: שבוע ויום לפני next_due, בפוש ובמייל (cron יומי), עם כיבוי בחשבון.

-- ─────────────────────────────────────────────────────────────
-- פרופיל
-- ─────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists email_verified_at timestamptz,
  add column if not exists signup_source text,
  add column if not exists signup_method text,
  add column if not exists vaccine_reminders boolean not null default true;

alter table public.profiles drop constraint if exists profiles_signup_source_check;
alter table public.profiles add constraint profiles_signup_source_check
  check (signup_source ~ '^[a-z_]{1,30}$');
alter table public.profiles drop constraint if exists profiles_signup_method_check;
alter table public.profiles add constraint profiles_signup_method_check
  check (signup_method in ('email', 'google'));

-- עד עכשיו Confirm email היה דלוק: מי שאישר מייל — מאושר.
update public.profiles p
set email_verified_at = u.email_confirmed_at
from auth.users u
where u.id = p.id and p.email_verified_at is null and u.email_confirmed_at is not null;

update public.profiles p
set signup_method = case when u.raw_app_meta_data ->> 'provider' = 'google' then 'google' else 'email' end
from auth.users u
where u.id = p.id and p.signup_method is null;

-- המשתמש מכבה/מדליק תזכורות חיסון בעצמו.
grant update (vaccine_reminders) on public.profiles to authenticated;

-- פרופיל חדש: כמו קודם, ובנוסף מקור, שיטה, ושם מגוגל. גוגל מאמתים את המייל בעצמם.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_terms     text := nullif(new.raw_user_meta_data ->> 'terms_version', '');
  v_marketing boolean := coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false);
  v_google    boolean := new.raw_app_meta_data ->> 'provider' = 'google';
  v_source    text := nullif(new.raw_user_meta_data ->> 'signup_source', '');
begin
  if v_source !~ '^[a-z_]{1,30}$' then
    v_source := null;
  end if;
  insert into public.profiles (
    id, email, phone, full_name, account_type,
    terms_version, terms_accepted_at, marketing_consent, marketing_consent_at,
    signup_source, signup_method, email_verified_at
  )
  values (
    new.id,
    new.email,
    new.phone,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.raw_user_meta_data ->> 'name', ''), 80),
    case when new.raw_user_meta_data ->> 'account_type' = 'business_owner'
      then 'business_owner'::public.account_type
      else 'pet_owner'::public.account_type
    end,
    v_terms,
    case when v_terms is not null then now() end,
    v_marketing,
    case when v_marketing then now() end,
    v_source,
    case when v_google then 'google' else 'email' end,
    case when v_google then now() end
  );
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- אישור מייל
-- ─────────────────────────────────────────────────────────────

-- נקרא אחרי כל כניסה דרך קישור במייל או גוגל (/auth/callback). מסמן רק אם הטוקן
-- הנוכחי נוצר בשיטה שמוכיחה בעלות על המייל — לא אחרי כניסה בסיסמה בלבד.
create or replace function public.mark_email_verified()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proof boolean;
begin
  if auth.uid() is null then
    return false;
  end if;
  select exists (
    select 1 from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) a
    where a ->> 'method' in ('otp', 'magiclink', 'email/signup', 'oauth', 'recovery', 'invite', 'email_change')
  ) into v_proof;
  if v_proof then
    update public.profiles set email_verified_at = now()
    where id = auth.uid() and email_verified_at is null;
  end if;
  return exists (select 1 from public.profiles where id = auth.uid() and email_verified_at is not null);
end;
$$;

revoke execute on function public.mark_email_verified() from public, anon;
grant execute on function public.mark_email_verified() to authenticated;

-- אחרי הרשמה עם גוגל: ההסכמה לתנאים (הוצגה ליד הכפתור) ומקור ההרשמה.
-- רק בשעה הראשונה של החשבון, ורק אם עוד לא נשמרו.
create or replace function public.complete_oauth_signup(p_terms_version text, p_source text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_terms_version is not null and p_terms_version !~ '^[0-9A-Za-z.\-]{1,20}$' then
    raise exception 'invalid terms version' using errcode = '22023';
  end if;
  update public.profiles
  set terms_version     = coalesce(terms_version, p_terms_version),
      terms_accepted_at = coalesce(terms_accepted_at, case when p_terms_version is not null then now() end),
      signup_source     = coalesce(signup_source, case when p_source ~ '^[a-z_]{1,30}$' then p_source end)
  where id = auth.uid() and created_at > now() - interval '1 hour';
end;
$$;

revoke execute on function public.complete_oauth_signup(text, text) from public, anon;
grant execute on function public.complete_oauth_signup(text, text) to authenticated;

-- ביקורת חדשה רק ממייל מאושר (נגד חשבונות מזויפים). עריכה של ביקורת קיימת — מותרת.
create or replace function public.reviews_require_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = new.user_id and email_verified_at is not null) then
    raise exception 'email not verified' using errcode = '42501', hint = 'verify_email';
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_require_verified on public.reviews;
create trigger reviews_require_verified before insert on public.reviews
  for each row execute function public.reviews_require_verified();

-- ─────────────────────────────────────────────────────────────
-- תזכורות חיסון
-- ─────────────────────────────────────────────────────────────

-- מה כבר נשלח (לכל חיסון, תאריך יעד וסוג), כדי לא לשלוח פעמיים.
create table if not exists public.vaccine_reminders_sent (
  vaccine_id uuid not null references public.pet_vaccines (id) on delete cascade,
  due_on     date not null,
  kind       text not null check (kind in ('week', 'day')),
  sent_at    timestamptz not null default now(),
  primary key (vaccine_id, due_on, kind)
);
alter table public.vaccine_reminders_sent enable row level security;
revoke all on public.vaccine_reminders_sent from anon, authenticated;

-- למי לשלוח היום. "week": היעד בעוד 2–7 ימים; "day": היעד מחר או היום.
-- חלון ולא תאריך מדויק, כדי שיום שבו ה-cron לא רץ לא יפיל תזכורת.
create or replace function public.due_vaccine_reminders(p_today date)
returns table (
  vaccine_id uuid, due_on date, kind text, vaccine_name text,
  pet_id uuid, pet_name text, user_id uuid, email text, full_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, v.next_due, k.kind, v.name, p.id, p.name, pr.id, pr.email, pr.full_name
  from public.pet_vaccines v
  join public.pets p on p.id = v.pet_id
  join public.profiles pr on pr.id = p.owner_id
  join (values ('week', 2, 7), ('day', 0, 1)) as k(kind, lo, hi)
    on v.next_due between p_today + k.lo and p_today + k.hi
  where pr.vaccine_reminders
    and pr.status = 'active'
    and pr.deleted_at is null
    and not exists (
      select 1 from public.vaccine_reminders_sent s
      where s.vaccine_id = v.id and s.due_on = v.next_due and s.kind = k.kind
    )
  limit 2000;
$$;

revoke execute on function public.due_vaccine_reminders(date) from public, anon, authenticated;
grant execute on function public.due_vaccine_reminders(date) to service_role;

-- ─────────────────────────────────────────────────────────────
-- משפך הרשמה (פאנל ניהול)
-- ─────────────────────────────────────────────────────────────

create or replace function public.admin_signup_funnel(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from date := public.israel_today() - (greatest(1, least(p_days, 365)) - 1);
  v_since timestamptz := (v_from::timestamp at time zone 'Asia/Jerusalem');
begin
  if not public.has_permission('dashboard.view') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return (
    with p as (
      select * from public.profiles where created_at >= v_since and deleted_at is null
    )
    select jsonb_build_object(
      'visitors',        (select count(distinct visitor) from public.analytics_pageviews where day >= v_from),
      'signup_visitors', (select count(distinct visitor) from public.analytics_pageviews where day >= v_from and path = '/signup'),
      'signups',         (select count(*) from p),
      'verified',        (select count(*) from p where email_verified_at is not null),
      'google',          (select count(*) from p where signup_method = 'google'),
      'with_pet',        (select count(*) from p where exists (select 1 from public.pets x where x.owner_id = p.id)),
      'with_favorite',   (select count(*) from p where exists (select 1 from public.favorites f where f.user_id = p.id)),
      'sources', (
        select coalesce(jsonb_agg(jsonb_build_object('source', s.source, 'count', s.n) order by s.n desc), '[]')
        from (select coalesce(signup_source, 'other') as source, count(*) as n from p group by 1) s
      )
    )
  );
end;
$$;

revoke execute on function public.admin_signup_funnel(int) from public, anon;
grant execute on function public.admin_signup_funnel(int) to authenticated;
