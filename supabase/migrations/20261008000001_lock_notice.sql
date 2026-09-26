-- Kami — הודעת נעילה במסך ההתחברות
--
-- משתמש נעול/חסום שמנסה להתחבר רואה חלון עם הסיבה ועד מתי. Auth מחזיר
-- "user banned" גם עם סיסמה שגויה, אז הפרטים מוחזרים רק אחרי בדיקת סיסמה כאן,
-- כדי שמי שמקליד מייל של מישהו אחר לא יראה את סיבת הנעילה שלו.
-- נקרא רק מהשרת (service_role), ורק אחרי ש-Auth החזיר user_banned (עם הגבלת הניסיונות שלו).
-- בטוח להריץ שוב.

create or replace function public.lock_notice(p_email text, p_password text)
returns table (status text, reason text, locked_until timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_id   uuid;
  v_hash text;
begin
  select u.id, u.encrypted_password into v_id, v_hash
  from auth.users u
  where lower(u.email) = lower(trim(p_email));

  if v_id is null or v_hash is null or v_hash = ''
     or extensions.crypt(coalesce(p_password, ''), v_hash) <> v_hash then
    return;
  end if;

  return query
  select case when p.deleted_at is not null then 'deleted' else p.status::text end,
         case when p.deleted_at is not null then null else p.status_reason end,
         case when p.deleted_at is not null then null else p.locked_until end
  from public.profiles p
  where p.id = v_id and (p.status <> 'active' or p.deleted_at is not null);
end;
$fn$;

revoke execute on function public.lock_notice(text, text) from public, anon, authenticated;
grant execute on function public.lock_notice(text, text) to service_role;

-- סוף הקובץ
