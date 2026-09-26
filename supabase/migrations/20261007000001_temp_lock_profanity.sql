-- Kami — נעילה זמנית של משתמשים + חיזוק סינון המילים
--
-- 1. נעילה לזמן מוגבל (למשל 48 שעות אחרי ביקורת פוגענית שהוסרה). locked_until
--    נשמר בפרופיל, Auth חוסם את ההתחברות לאותו זמן, ומשימה מתוזמנת (pg_cron)
--    משחררת את הנעילה כשהזמן עובר ורושמת את זה ביומן הפעולות.
-- 2. סינון מילים: ספרות וסימנים בתוך מילה בעברית ("ז1נה", "ש@רמוטה") נבדקים
--    גם כאותיות עבריות דומות (ו / י), לא רק כאותיות לטיניות.

-- ─────────────────────────────────────────────────────────────
-- נעילה זמנית
-- ─────────────────────────────────────────────────────────────

alter table public.profiles add column locked_until timestamptz;

drop function public.admin_set_user_status(uuid, public.account_status, text);

-- p_hours: רק לנעילה. null = עד שחרור ידני.
-- מחזיר true אם המשתמש צריך להיות חסום להתחברות (השרת מעדכן את Auth בהתאם).
create function public.admin_set_user_status(
  p_user_id uuid,
  p_status  public.account_status,
  p_reason  text default null,
  p_hours   int default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old     public.account_status;
  v_deleted timestamptz;
  v_reason  text := nullif(trim(p_reason), '');
  v_until   timestamptz;
begin
  perform public.assert_can_manage_user(p_user_id);

  if p_hours is not null and (p_status <> 'locked' or p_hours not between 1 and 720) then
    raise exception 'invalid duration' using errcode = '22023';
  end if;

  select status, deleted_at into v_old, v_deleted
  from public.profiles where id = p_user_id for update;

  if v_old = p_status and p_status <> 'locked' then
    return v_deleted is not null or p_status <> 'active';
  end if;

  if 'blocked' in (v_old, p_status) then
    perform public.assert_permission('users.block');
  else
    perform public.assert_permission('users.lock');
  end if;

  if p_status <> 'active' and v_reason is null then
    raise exception 'reason required' using errcode = '22023';
  end if;

  v_until := case when p_hours is not null then now() + make_interval(hours => p_hours) end;

  update public.profiles
  set status = p_status,
      status_reason = case when p_status = 'active' then null else v_reason end,
      locked_until = v_until
  where id = p_user_id;

  perform public.log_admin_action(
    case p_status
      when 'active'  then case v_old when 'blocked' then 'user.unblock' else 'user.unlock' end
      when 'locked'  then 'user.lock'
      when 'blocked' then 'user.block'
    end,
    'user', p_user_id::text,
    jsonb_strip_nulls(jsonb_build_object('from', v_old, 'to', p_status, 'reason', v_reason,
                                         'hours', p_hours, 'until', v_until))
  );

  return v_deleted is not null or p_status <> 'active';
end;
$$;

revoke execute on function public.admin_set_user_status(uuid, public.account_status, text, int) from public, anon;
grant execute on function public.admin_set_user_status(uuid, public.account_status, text, int) to authenticated;

-- משחרר נעילות שהזמן שלהן עבר. רץ כל 5 דקות (למטה). ההתחברות עצמה משתחררת
-- ב-Auth באותו זמן, כי החסימה שם נקבעה לאותו מספר שעות.
create function public.release_expired_locks()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  with released as (
    update public.profiles
    set status = 'active', status_reason = null, locked_until = null
    where status = 'locked' and locked_until is not null and locked_until <= now()
    returning id
  ), logged as (
    insert into public.audit_log (actor_id, action, target_type, target_id, details)
    select null, 'user.unlock', 'user', id::text, jsonb_build_object('auto', true, 'reason', 'תם זמן הנעילה')
    from released
    returning 1
  )
  select count(*) into v_count from logged;
  return v_count;
end;
$$;

revoke execute on function public.release_expired_locks() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('kami-release-expired-locks', '*/5 * * * *', 'select public.release_expired_locks()');

-- ─────────────────────────────────────────────────────────────
-- סינון מילים: ספרות וסימנים בתוך מילים בעברית
-- ─────────────────────────────────────────────────────────────

-- "ב1 ז1נה" → "בו זונה" / "בי זינה", "ש@רמוטה" → "שרמוטה". תו שנראה כמו ו/י
-- (0 1 ! | o i l) או סימן (@ *) שצמוד לאות עברית מוחלף ב-p_letter ('ו', 'י' או ריק)
-- לפני הנרמול הרגיל.
create function public.hebraize_lookalikes(p_text text, p_letter text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    regexp_replace(lower(coalesce(p_text, '')), '(?<=[א-ת])[01!|oil@*]+', p_letter, 'g'),
    '[01!|oil@*]+(?=[א-ת])', p_letter, 'g');
$$;

create or replace function public.find_profanity(p_text text)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  with raw as (
    select public.normalize_for_profanity(p_text) as v
    union
    select public.normalize_for_profanity(public.hebraize_lookalikes(p_text, 'ו'))
    union
    select public.normalize_for_profanity(public.hebraize_lookalikes(p_text, 'י'))
    union
    select public.normalize_for_profanity(public.hebraize_lookalikes(p_text, ''))
  ),
  -- מילים תקינות שמכילות מילה אסורה ("מזונה של החתולה", "מזונות") יוצאות מהבדיקה.
  variants as (
    select regexp_replace(v, '(^| )[הובלשכ]{0,2}(מזונה|מזונות|מזונמ|מזונכמ)(?= |$)', ' ', 'g') as v from raw
  )
  select coalesce(array_agg(distinct t.term), '{}')
  from public.banned_terms t
  where exists (
    select 1 from variants
    where variants.v ~ (
      '(^| )' || case when t.allow_prefix then '[הובלמשכ]{0,2}' else '' end || t.term || '( |$)'
    )
  );
$$;

grant execute on function public.hebraize_lookalikes(text, text) to anon, authenticated;

-- צורות נוספות שנפוצות בעקיפות ("בי-זונה", "יא זונה")
insert into public.banned_terms (term, allow_prefix)
select public.normalize_for_profanity(w), true
from (values ('ביזונה'), ('בי זונה'), ('יא זונה'), ('בנאזונה'), ('בן אלף זונות')) as t(w)
on conflict do nothing;
