-- Kami — סטטיסטיקות: לפי חודש וכל הזמנים (פאנל ← דשבורד).
-- אותם מספרים כמו ב-admin_site_stats, לטווח תאריכים כלשהו.
-- צפיות נשמרות שנה (track_presence מנקה), ולכן "כל הזמנים" של מבקרים וצפיות = עד שנה אחורה.

create or replace function public.admin_range_stats(p_from date, p_to date)
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
  return jsonb_build_object(
    'visitors',   (select count(distinct visitor) from public.analytics_pageviews where day between p_from and p_to),
    'pageviews',  (select count(*) from public.analytics_pageviews where day between p_from and p_to),
    'members',    (select count(distinct user_id) from public.analytics_pageviews where day between p_from and p_to and user_id is not null),
    'guests',     (select count(distinct visitor) from public.analytics_pageviews v
                   where day between p_from and p_to and user_id is null
                     and not exists (select 1 from public.analytics_pageviews w
                                     where w.visitor = v.visitor and w.day = v.day and w.user_id is not null)),
    'signups',    (select count(*) from public.profiles
                   where (created_at at time zone 'Asia/Jerusalem')::date between p_from and p_to and deleted_at is null),
    'businesses', (select count(*) from public.businesses
                   where (created_at at time zone 'Asia/Jerusalem')::date between p_from and p_to)
  );
end;
$$;

revoke execute on function public.admin_range_stats(date, date) from public, anon;
grant execute on function public.admin_range_stats(date, date) to authenticated;

-- כל הזמנים + כל חודש מאז הפעילות הראשונה (עד 24 חודשים, החדש ראשון).
create or replace function public.admin_site_stats_extra()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := public.israel_today();
  v_first date;
begin
  if not public.has_permission('dashboard.view') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select least(
    (select min(day) from public.analytics_pageviews),
    (select min((created_at at time zone 'Asia/Jerusalem')::date) from public.profiles),
    (select min((created_at at time zone 'Asia/Jerusalem')::date) from public.businesses)
  ) into v_first;
  v_first := coalesce(v_first, v_today);

  return jsonb_build_object(
    'all', public.admin_range_stats(v_first, v_today),
    'since', v_first,
    'months', (
      select coalesce(jsonb_agg(jsonb_build_object('month', to_char(m, 'YYYY-MM'))
               || public.admin_range_stats(m::date, least((m + interval '1 month - 1 day')::date, v_today))
               order by m desc), '[]')
      from generate_series(
        greatest(date_trunc('month', v_first), date_trunc('month', v_today) - interval '23 months'),
        date_trunc('month', v_today), interval '1 month') as m
    )
  );
end;
$$;

revoke execute on function public.admin_site_stats_extra() from public, anon;
grant execute on function public.admin_site_stats_extra() to authenticated;
