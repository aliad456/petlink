-- PetLink — שלב 2: ניהול משתמשים
--
-- כל פעולת אדמין על משתמש עוברת דרך פונקציה במסד. הפונקציה:
--   1. בודקת הרשאה (has_permission / is_owner)
--   2. בודקת שמותר לגעת במשתמש הזה (can_manage_user)
--   3. מבצעת את השינוי ורושמת ביומן, באותה טרנזקציה
-- פעולות שדורשות את Auth Admin API (חסימת התחברות, מייל איפוס, מחיקה לצמיתות)
-- מבוצעות בשרת רק אחרי שהפונקציה המתאימה אישרה ורשמה אותן.

-- ─────────────────────────────────────────────────────────────
-- מחיקה רכה
-- ─────────────────────────────────────────────────────────────

alter table public.profiles
  add column deleted_at timestamptz,
  add column deleted_by uuid references public.profiles (id) on delete set null;

create index profiles_deleted_at_idx on public.profiles (deleted_at) where deleted_at is not null;
create index profiles_phone_digits_idx on public.profiles (regexp_replace(coalesce(phone, ''), '\D', '', 'g'));

-- ─────────────────────────────────────────────────────────────
-- הודעות מהצוות למשתמש (מוצגות בעמוד "החשבון שלי")
-- ─────────────────────────────────────────────────────────────

create table public.user_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  sender_id  uuid references public.profiles (id) on delete set null,
  subject    text not null check (char_length(subject) between 1 and 200),
  body       text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);

create index user_messages_user_idx on public.user_messages (user_id, created_at desc);

alter table public.user_messages enable row level security;

create policy user_messages_select_own on public.user_messages
  for select to authenticated using (user_id = auth.uid());
create policy user_messages_select_staff on public.user_messages
  for select to authenticated using (public.has_permission('users.message'));
create policy user_messages_mark_read on public.user_messages
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- משתמש יכול רק לסמן הודעה כנקראה. שליחה רק דרך admin_send_message.
revoke insert, update, delete on public.user_messages from anon, authenticated;
grant update (read_at) on public.user_messages to authenticated;

-- ─────────────────────────────────────────────────────────────
-- עזרים
-- ─────────────────────────────────────────────────────────────

-- האם המשתמש הנוכחי רשאי לפעול על משתמש היעד:
-- אף אחד לא פועל על עצמו או על הבעלים, ועל חברי צוות רק הבעלים.
create function public.can_manage_user(p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_target <> auth.uid()
    and not exists (select 1 from public.staff_members where user_id = p_target and is_owner)
    and (
      public.is_owner()
      or not exists (select 1 from public.staff_members where user_id = p_target)
    );
$$;

create function public.assert_can_manage_user(p_target uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = p_target) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  if not public.can_manage_user(p_target) then
    raise exception 'cannot manage this user' using errcode = '42501';
  end if;
end;
$$;

create function public.assert_permission(p_permission text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission(p_permission) then
    raise exception 'missing permission %', p_permission using errcode = '42501';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- חיפוש ורשימה
-- ─────────────────────────────────────────────────────────────

-- חיפוש אחד לשם, טלפון או מייל. טלפון מושווה לפי ספרות בלבד,
-- כך ש-"050-123 4567", "0501234567" ו-"+972501234567" מוצאים אותו אדם.
create function public.admin_list_users(
  p_query  text default null,
  p_status text default null,  -- active | locked | blocked | deleted | null (כולם חוץ ממחוקים)
  p_type   text default null,  -- pet_owner | business_owner | staff | null
  p_limit  int default 30,
  p_offset int default 0
)
returns table (
  id              uuid,
  full_name       text,
  email           text,
  phone           text,
  account_type    public.account_type,
  status          public.account_status,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  deleted_at      timestamptz,
  is_staff        boolean,
  is_owner        boolean,
  total_count     bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query  text := nullif(trim(p_query), '');
  v_digits text := regexp_replace(coalesce(p_query, ''), '\D', '', 'g');
begin
  perform public.assert_permission('users.view');

  -- 972501234567 → 0501234567
  if v_digits like '972%' then
    v_digits := '0' || substr(v_digits, 4);
  end if;

  return query
  select
    p.id, p.full_name, p.email, p.phone, p.account_type, p.status, p.created_at,
    u.last_sign_in_at, p.deleted_at,
    s.user_id is not null, coalesce(s.is_owner, false),
    count(*) over ()
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.staff_members s on s.user_id = p.id
  where
    (case
      when p_status = 'deleted' then p.deleted_at is not null
      when p_status is null then p.deleted_at is null
      else p.deleted_at is null and p.status::text = p_status
    end)
    and (p_type is null
      or (p_type = 'staff' and s.user_id is not null)
      or p.account_type::text = p_type)
    and (v_query is null
      or p.full_name ilike '%' || v_query || '%'
      or p.email ilike '%' || v_query || '%'
      or (length(v_digits) >= 3
          and regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') like '%' || v_digits || '%'))
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
end;
$$;

-- כרטיס משתמש מלא.
create function public.admin_get_user(p_user_id uuid)
returns table (
  id                 uuid,
  full_name          text,
  email              text,
  phone              text,
  account_type       public.account_type,
  status             public.account_status,
  status_reason      text,
  created_at         timestamptz,
  last_sign_in_at    timestamptz,
  email_confirmed_at timestamptz,
  deleted_at         timestamptz,
  is_staff           boolean,
  is_owner           boolean,
  staff_role         text,
  can_manage         boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('users.view');

  return query
  select
    p.id, p.full_name, p.email, p.phone, p.account_type, p.status, p.status_reason,
    p.created_at, u.last_sign_in_at, u.email_confirmed_at, p.deleted_at,
    s.user_id is not null, coalesce(s.is_owner, false), r.name,
    public.can_manage_user(p.id)
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.staff_members s on s.user_id = p.id
  left join public.staff_roles r on r.id = s.role_id
  where p.id = p_user_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- פעולות
-- ─────────────────────────────────────────────────────────────

-- שינוי סטטוס. נעילה/שחרור דורשים users.lock, חסימה/ביטול חסימה users.block.
-- מחזיר true אם המשתמש צריך להיות חסום להתחברות (השרת מעדכן את Auth בהתאם).
create function public.admin_set_user_status(
  p_user_id uuid,
  p_status  public.account_status,
  p_reason  text default null
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
begin
  perform public.assert_can_manage_user(p_user_id);

  select status, deleted_at into v_old, v_deleted
  from public.profiles where id = p_user_id for update;

  if v_old = p_status then
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

  update public.profiles
  set status = p_status,
      status_reason = case when p_status = 'active' then null else v_reason end
  where id = p_user_id;

  perform public.log_admin_action(
    case p_status
      when 'active'  then case v_old when 'blocked' then 'user.unblock' else 'user.unlock' end
      when 'locked'  then 'user.lock'
      when 'blocked' then 'user.block'
    end,
    'user', p_user_id::text,
    jsonb_build_object('from', v_old, 'to', p_status, 'reason', v_reason)
  );

  return v_deleted is not null or p_status <> 'active';
end;
$$;

-- מחיקה רכה: המשתמש נחסם להתחברות ונעלם מהרשימה. הבעלים יכול לשחזר.
create function public.admin_soft_delete_user(p_user_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('users.delete');
  perform public.assert_can_manage_user(p_user_id);

  update public.profiles
  set deleted_at = now(), deleted_by = auth.uid()
  where id = p_user_id and deleted_at is null;

  perform public.log_admin_action(
    'user.delete', 'user', p_user_id::text,
    jsonb_build_object('reason', nullif(trim(p_reason), ''))
  );
end;
$$;

-- שחזור משתמש שנמחק (בעלים בלבד). מחזיר true אם עדיין צריך חסימה (סטטוס לא פעיל).
create function public.admin_restore_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.account_status;
begin
  if not public.is_owner() then
    raise exception 'owner only' using errcode = '42501';
  end if;
  perform public.assert_can_manage_user(p_user_id);

  update public.profiles
  set deleted_at = null, deleted_by = null
  where id = p_user_id
  returning status into v_status;

  perform public.log_admin_action('user.restore', 'user', p_user_id::text);
  return v_status <> 'active';
end;
$$;

-- אישור ורישום של מחיקה לצמיתות (בעלים בלבד). השרת מוחק אחר כך דרך Auth Admin API,
-- והמחיקה מ-auth.users מוחקת בשרשור את הפרופיל, ההודעות וכו'.
create function public.admin_authorize_permanent_delete(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'owner only' using errcode = '42501';
  end if;
  perform public.assert_can_manage_user(p_user_id);
  perform public.log_admin_action('user.delete_permanent', 'user', p_user_id::text);
end;
$$;

-- אישור ורישום של שליחת מייל לאיפוס סיסמה. מחזיר את המייל שאליו לשלוח.
create function public.admin_authorize_password_reset(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  perform public.assert_permission('users.reset_password');
  perform public.assert_can_manage_user(p_user_id);

  select email into v_email from public.profiles where id = p_user_id;
  if v_email is null then
    raise exception 'user has no email' using errcode = '22023';
  end if;

  perform public.log_admin_action('user.reset_password', 'user', p_user_id::text);
  return v_email;
end;
$$;

create function public.admin_send_message(p_user_id uuid, p_subject text, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.assert_permission('users.message');
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  insert into public.user_messages (user_id, sender_id, subject, body)
  values (p_user_id, auth.uid(), trim(p_subject), trim(p_body))
  returning id into v_id;

  perform public.log_admin_action(
    'user.message', 'user', p_user_id::text,
    jsonb_build_object('message_id', v_id, 'subject', trim(p_subject))
  );
  return v_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- הרשאות הרצה
-- ─────────────────────────────────────────────────────────────

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.can_manage_user(uuid)',
    'public.assert_can_manage_user(uuid)',
    'public.assert_permission(text)',
    'public.admin_list_users(text, text, text, int, int)',
    'public.admin_get_user(uuid)',
    'public.admin_set_user_status(uuid, public.account_status, text)',
    'public.admin_soft_delete_user(uuid, text)',
    'public.admin_restore_user(uuid)',
    'public.admin_authorize_permanent_delete(uuid)',
    'public.admin_authorize_password_reset(uuid)',
    'public.admin_send_message(uuid, text, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end;
$$;
