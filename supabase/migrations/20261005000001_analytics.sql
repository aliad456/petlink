-- Kami — סטטיסטיקות אתר (בלי גוגל אנליטיקס ובלי עוגיות)
--
-- כל צפייה בעמוד נרשמת עם "מבקר" = גיבוב (hash) של IP + דפדפן + מלח סודי
-- שמשתנה כל יום. ה-IP עצמו לא נשמר, ואי אפשר לקשר מבקר בין ימים.
-- "עכשיו באתר" = מבקרים שהדף שלהם שלח סימן חיים ב-5 הדקות האחרונות.
-- הצפייה בנתונים: הרשאת dashboard.view (דרך admin_site_stats).

create table public.analytics_pageviews (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  day         date not null default public.israel_today(),
  visitor     text not null check (char_length(visitor) between 8 and 64),
  user_id     uuid references public.profiles (id) on delete set null,
  path        text not null check (char_length(path) between 1 and 300),
  business_id uuid references public.businesses (id) on delete set null,
  referrer    text check (char_length(referrer) <= 120)  -- רק שם האתר (למשל t.co, google.com)
);

create index analytics_pageviews_day_idx on public.analytics_pageviews (day);
create index analytics_pageviews_created_idx on public.analytics_pageviews (created_at);
create index analytics_pageviews_business_idx on public.analytics_pageviews (business_id, day) where business_id is not null;

create table public.analytics_presence (
  visitor   text primary key,
  user_id   uuid references public.profiles (id) on delete set null,
  path      text,
  last_seen timestamptz not null default now()
);
create index analytics_presence_seen_idx on public.analytics_presence (last_seen);

alter table public.analytics_pageviews enable row level security;
alter table public.analytics_presence  enable row level security;
-- אין גישה ישירה: כתיבה דרך track_*, קריאה דרך admin_site_stats.
revoke all on public.analytics_pageviews, public.analytics_presence from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- רישום (נקרא מהשרת של האתר, /api/track)
-- ─────────────────────────────────────────────────────────────

create function public.track_pageview(p_visitor text, p_path text, p_referrer text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business uuid;
  v_public_id bigint;
begin
  if p_visitor !~ '^[0-9a-f]{16,64}$' or p_path !~ '^/' then
    return;
  end if;
  -- עמוד עסק: /b/1234
  if p_path ~ '^/b/[0-9]+$' then
    v_public_id := substring(p_path from 4)::bigint;
    select id into v_business from public.businesses where public_id = v_public_id;
  end if;
  insert into public.analytics_pageviews (visitor, user_id, path, business_id, referrer)
  values (p_visitor, auth.uid(), left(p_path, 300), v_business, nullif(left(p_referrer, 120), ''));

  insert into public.analytics_presence (visitor, user_id, path, last_seen)
  values (p_visitor, auth.uid(), left(p_path, 300), now())
  on conflict (visitor) do update set user_id = coalesce(excluded.user_id, public.analytics_presence.user_id),
    path = excluded.path, last_seen = now();
end;
$$;

-- סימן חיים כל דקה בזמן שהלשונית פתוחה
create function public.track_presence(p_visitor text, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_visitor !~ '^[0-9a-f]{16,64}$' then
    return;
  end if;
  insert into public.analytics_presence (visitor, user_id, path, last_seen)
  values (p_visitor, auth.uid(), left(p_path, 300), now())
  on conflict (visitor) do update set user_id = coalesce(excluded.user_id, public.analytics_presence.user_id),
    path = excluded.path, last_seen = now();
  -- ניקוי: מי שלא נראה שעה, וצפיות בנות יותר משנה (כמו שכתוב במדיניות הפרטיות)
  delete from public.analytics_presence where last_seen < now() - interval '1 hour';
  delete from public.analytics_pageviews where day < public.israel_today() - 365;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- קריאה (פאנל ניהול)
-- ─────────────────────────────────────────────────────────────

-- מספרים לתקופות: היום, 3 ימים, 7 ימים, 30 ימים (כולל היום).
create function public.admin_site_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := public.israel_today();
  v_result jsonb;
begin
  if not public.has_permission('dashboard.view') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'periods', (
      select jsonb_object_agg(p.days, jsonb_build_object(
        'visitors',   (select count(distinct visitor) from public.analytics_pageviews where day > v_today - p.days),
        'pageviews',  (select count(*) from public.analytics_pageviews where day > v_today - p.days),
        'members',    (select count(distinct user_id) from public.analytics_pageviews where day > v_today - p.days and user_id is not null),
        'guests',     (select count(distinct visitor) from public.analytics_pageviews v
                       where day > v_today - p.days and user_id is null
                         and not exists (select 1 from public.analytics_pageviews w
                                         where w.visitor = v.visitor and w.day = v.day and w.user_id is not null)),
        'signups',    (select count(*) from public.profiles
                       where (created_at at time zone 'Asia/Jerusalem')::date > v_today - p.days and deleted_at is null),
        'businesses', (select count(*) from public.businesses
                       where (created_at at time zone 'Asia/Jerusalem')::date > v_today - p.days)
      ))
      from (values (1), (3), (7), (30)) as p(days)
    ),
    'series', (
      select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'visitors', (select count(distinct visitor) from public.analytics_pageviews where day = d.day),
        'signups',  (select count(*) from public.profiles where (created_at at time zone 'Asia/Jerusalem')::date = d.day)
      ) order by d.day)
      from (select generate_series(v_today - 29, v_today, interval '1 day')::date as day) d
    ),
    'top_pages', (
      select coalesce(jsonb_agg(t order by t.views desc), '[]')
      from (
        select path, count(*) as views, count(distinct visitor) as visitors
        from public.analytics_pageviews
        where day > v_today - 7 and business_id is null
        group by path order by count(*) desc limit 8
      ) t
    ),
    'top_businesses', (
      select coalesce(jsonb_agg(t order by t.views desc), '[]')
      from (
        select b.name, b.public_id, count(*) as views, count(distinct pv.visitor) as visitors
        from public.analytics_pageviews pv
        join public.businesses b on b.id = pv.business_id
        where pv.day > v_today - 7
        group by b.name, b.public_id order by count(*) desc limit 8
      ) t
    ),
    'referrers', (
      select coalesce(jsonb_agg(t order by t.visitors desc), '[]')
      from (
        select referrer, count(distinct visitor) as visitors
        from public.analytics_pageviews
        where day > v_today - 7 and referrer is not null
        group by referrer order by count(distinct visitor) desc limit 6
      ) t
    ),
    'totals', jsonb_build_object(
      'users',      (select count(*) from public.profiles where deleted_at is null),
      'pets',       (select count(*) from public.pets),
      'businesses', (select count(*) from public.businesses where status = 'approved')
    )
  ) into v_result;
  return v_result;
end;
$$;

-- "עכשיו באתר": נקרא כל כמה שניות מהדשבורד
create function public.admin_live_now()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('dashboard.view') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'total',   count(*),
      'members', count(*) filter (where user_id is not null),
      'guests',  count(*) filter (where user_id is null),
      'pages', coalesce((
        select jsonb_agg(t order by t.n desc)
        from (select path, count(*) as n from public.analytics_presence
              where last_seen > now() - interval '5 minutes' group by path order by count(*) desc limit 5) t
      ), '[]')
    )
    from public.analytics_presence
    where last_seen > now() - interval '5 minutes'
  );
end;
$$;

revoke execute on function public.track_pageview(text, text, text) from public;
revoke execute on function public.track_presence(text, text) from public;
grant execute on function public.track_pageview(text, text, text) to anon, authenticated;
grant execute on function public.track_presence(text, text) to anon, authenticated;
revoke execute on function public.admin_site_stats() from public, anon;
revoke execute on function public.admin_live_now() from public, anon;
grant execute on function public.admin_site_stats() to authenticated;
grant execute on function public.admin_live_now() to authenticated;
