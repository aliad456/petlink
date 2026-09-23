-- PetLink — שלב 1: תשתית
-- פרופילים, מבנה הרשאות מנהלים, יומן פעולות, קטגוריות ופילטרים.
--
-- עקרונות:
--   * כל טבלה מוגנת ב-RLS. אין גישה בלי מדיניות מפורשת.
--   * הרשאות מנהלים נבדקות במסד עצמו (has_permission), לא רק בקוד.
--   * פעולת מנהל דורשת אימות דו-שלבי (aal2) — גם זה נאכף במסד.
--   * יומן הפעולות הוא append-only: אין עדכון ואין מחיקה.

-- ─────────────────────────────────────────────────────────────
-- טיפוסים
-- ─────────────────────────────────────────────────────────────

create type public.account_status as enum ('active', 'locked', 'blocked');
create type public.account_type as enum ('pet_owner', 'business_owner');

-- ─────────────────────────────────────────────────────────────
-- פרופילים (שורה לכל משתמש ב-auth.users)
-- ─────────────────────────────────────────────────────────────

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null default '',
  email         text,
  phone         text,
  avatar_url    text,
  account_type  public.account_type not null default 'pet_owner',
  status        public.account_status not null default 'active',
  status_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (lower(email));
create index profiles_phone_idx on public.profiles (phone);
create index profiles_full_name_idx on public.profiles (lower(full_name));

-- ─────────────────────────────────────────────────────────────
-- הרשאות, תפקידים וצוות
-- ─────────────────────────────────────────────────────────────

-- קטלוג ההרשאות. המפתחות משוכפלים ב-src/lib/auth/permissions.ts.
create table public.permissions (
  key         text primary key,
  group_key   text not null,
  label       text not null,
  description text,
  sort_order  int not null default 0
);

-- תפקידים מוכנים (תבניות). בחירת תפקיד ממלאת את תיבות הסימון של העובד,
-- ואחר כך אפשר להוסיף או להוריד הרשאות לכל עובד בנפרד.
create table public.staff_roles (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  description text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.staff_role_permissions (
  role_id        uuid not null references public.staff_roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role_id, permission_key)
);

-- חברי צוות. הבעלים (is_owner) מקבל גישה מלאה בלי קשר לטבלת ההרשאות.
create table public.staff_members (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  role_id    uuid references public.staff_roles (id) on delete set null,
  is_owner   boolean not null default false,
  is_active  boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- יכול להיות רק בעלים אחד.
create unique index staff_members_single_owner on public.staff_members (is_owner) where is_owner;

-- ההרשאות בפועל של כל עובד (תיבות הסימון).
create table public.staff_permissions (
  user_id        uuid not null references public.staff_members (user_id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  granted_by     uuid references public.profiles (id) on delete set null,
  granted_at     timestamptz not null default now(),
  primary key (user_id, permission_key)
);

-- ─────────────────────────────────────────────────────────────
-- יומן פעולות (append-only)
-- ─────────────────────────────────────────────────────────────

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
create index audit_log_target_idx on public.audit_log (target_type, target_id);

-- ─────────────────────────────────────────────────────────────
-- קטגוריות ופילטרים (מנוהלים מהאדמין, בלי קוד)
-- ─────────────────────────────────────────────────────────────

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  description text,
  icon        text,
  sort_order  int not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- סוג הפילטר:
--   boolean       — מאפיין כן/לא שהעסק מסמן (מגיע לבית הלקוח)
--   multi_select  — מאפיין עם כמה ערכים (סוג חיה)
--   open_now      — מחושב משעות הפעילות
--   distance      — מחושב ממיקום העסק
create type public.filter_kind as enum ('boolean', 'multi_select', 'open_now', 'distance');

create table public.filters (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z0-9_]+$'),
  name        text not null,
  kind        public.filter_kind not null,
  -- לפילטר multi_select: [{"value": "dog", "label": "כלב"}, ...]
  options     jsonb not null default '[]'::jsonb,
  is_featured boolean not null default false, -- מובלט בממשק (נקודת בידול)
  sort_order  int not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- באילו קטגוריות מוצג כל פילטר. פילטר בלי שורות כאן מוצג בכל הקטגוריות.
create table public.category_filters (
  category_id uuid not null references public.categories (id) on delete cascade,
  filter_id   uuid not null references public.filters (id) on delete cascade,
  primary key (category_id, filter_id)
);

-- ─────────────────────────────────────────────────────────────
-- פונקציות עזר להרשאות
-- ─────────────────────────────────────────────────────────────

-- האם הסשן הנוכחי עבר אימות דו-שלבי.
create function public.is_mfa_verified()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

-- האם המשתמש הנוכחי חבר צוות פעיל עם חשבון פעיל (בלי תלות ב-2FA).
create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_members s
    join public.profiles p on p.id = s.user_id
    where s.user_id = auth.uid()
      and s.is_active
      and p.status = 'active'
  );
$$;

-- האם המשתמש הנוכחי הוא הבעלים, בסשן מאומת דו-שלבית.
create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_mfa_verified() and exists (
    select 1
    from public.staff_members s
    join public.profiles p on p.id = s.user_id
    where s.user_id = auth.uid()
      and s.is_owner
      and s.is_active
      and p.status = 'active'
  );
$$;

-- בדיקת ההרשאה המרכזית. כל פעולת אדמין עוברת כאן.
create function public.has_permission(permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_owner() or (
    public.is_mfa_verified() and exists (
      select 1
      from public.staff_members s
      join public.profiles p on p.id = s.user_id
      join public.staff_permissions sp on sp.user_id = s.user_id
      where s.user_id = auth.uid()
        and s.is_active
        and p.status = 'active'
        and sp.permission_key = permission
    )
  );
$$;

-- רשימת ההרשאות של המשתמש הנוכחי (לתצוגה בממשק).
create function public.my_permissions()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select p.key from public.permissions p where public.is_owner()
  union
  select sp.permission_key
  from public.staff_permissions sp
  join public.staff_members s on s.user_id = sp.user_id
  join public.profiles pr on pr.id = s.user_id
  where sp.user_id = auth.uid()
    and s.is_active
    and pr.status = 'active'
    and public.is_mfa_verified();
$$;

-- רישום ביומן. נקרא מתוך פונקציות אדמין ומהשרת.
create function public.log_admin_action(
  p_action      text,
  p_target_type text default null,
  p_target_id   text default null,
  p_details     jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() or not public.is_mfa_verified() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- טריגרים
-- ─────────────────────────────────────────────────────────────

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger filters_updated_at before update on public.filters
  for each row execute function public.set_updated_at();

-- יצירת פרופיל אוטומטית בהרשמה. account_type מגיע מ-metadata של ההרשמה,
-- וכל ערך אחר מ-"business_owner" הופך ל-pet_owner.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, phone, full_name, account_type)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'account_type' = 'business_owner'
      then 'business_owner'::public.account_type
      else 'pet_owner'::public.account_type
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- סנכרון מייל וטלפון כשהם משתנים ב-auth.
create function public.handle_user_contact_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email, phone = new.phone
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_contact_changed after update of email, phone on auth.users
  for each row execute function public.handle_user_contact_change();

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────

alter table public.profiles               enable row level security;
alter table public.permissions            enable row level security;
alter table public.staff_roles            enable row level security;
alter table public.staff_role_permissions enable row level security;
alter table public.staff_members          enable row level security;
alter table public.staff_permissions      enable row level security;
alter table public.audit_log              enable row level security;
alter table public.categories             enable row level security;
alter table public.filters                enable row level security;
alter table public.category_filters       enable row level security;

-- פרופילים: משתמש רואה ועורך את עצמו; צוות עם הרשאה רואה את כולם.
-- שינוי סטטוס וסוג חשבון נעשה רק דרך פונקציות אדמין (ראו הרשאות עמודה בהמשך).
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_select_staff on public.profiles
  for select to authenticated using (public.has_permission('users.view'));
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- משתמש רגיל יכול לעדכן רק את השדות האלה בפרופיל שלו.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

-- קטלוג הרשאות ותפקידים: קריאה לצוות, עריכה לבעלים בלבד.
create policy permissions_select on public.permissions
  for select to authenticated using (public.is_staff());

create policy staff_roles_select on public.staff_roles
  for select to authenticated using (public.is_staff());
create policy staff_roles_owner_write on public.staff_roles
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

create policy staff_role_permissions_select on public.staff_role_permissions
  for select to authenticated using (public.is_staff());
create policy staff_role_permissions_owner_write on public.staff_role_permissions
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- צוות: כל חבר צוות רואה את עצמו; הבעלים רואה ומנהל את כולם.
-- הבעלים לא יכול להפוך מישהו אחר לבעלים דרך ה-API (is_owner מוגדר רק ב-bootstrap).
create policy staff_members_select_self on public.staff_members
  for select to authenticated using (user_id = auth.uid());
create policy staff_members_select_owner on public.staff_members
  for select to authenticated using (public.is_owner());
create policy staff_members_owner_insert on public.staff_members
  for insert to authenticated with check (public.is_owner() and not is_owner);
create policy staff_members_owner_update on public.staff_members
  for update to authenticated
  using (public.is_owner() and not is_owner)
  with check (public.is_owner() and not is_owner);
create policy staff_members_owner_delete on public.staff_members
  for delete to authenticated using (public.is_owner() and not is_owner);

create policy staff_permissions_select_self on public.staff_permissions
  for select to authenticated using (user_id = auth.uid());
create policy staff_permissions_select_owner on public.staff_permissions
  for select to authenticated using (public.is_owner());
create policy staff_permissions_owner_write on public.staff_permissions
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- יומן: קריאה בלבד, לבעלים או למי שקיבל הרשאה. כתיבה רק דרך log_admin_action.
create policy audit_log_select on public.audit_log
  for select to authenticated using (public.has_permission('audit.view'));
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;

-- קטגוריות ופילטרים: הגלויים פתוחים לכולם, והצוות המורשה מנהל.
create policy categories_select_public on public.categories
  for select to anon, authenticated using (is_visible);
create policy categories_select_staff on public.categories
  for select to authenticated using (public.has_permission('catalog.manage'));
create policy categories_write on public.categories
  for all to authenticated
  using (public.has_permission('catalog.manage'))
  with check (public.has_permission('catalog.manage'));

create policy filters_select_public on public.filters
  for select to anon, authenticated using (is_visible);
create policy filters_select_staff on public.filters
  for select to authenticated using (public.has_permission('catalog.manage'));
create policy filters_write on public.filters
  for all to authenticated
  using (public.has_permission('catalog.manage'))
  with check (public.has_permission('catalog.manage'));

create policy category_filters_select on public.category_filters
  for select to anon, authenticated using (true);
create policy category_filters_write on public.category_filters
  for all to authenticated
  using (public.has_permission('catalog.manage'))
  with check (public.has_permission('catalog.manage'));

-- פונקציות העזר לא נחשפות לאנונימיים.
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.is_owner() from public, anon;
revoke execute on function public.has_permission(text) from public, anon;
revoke execute on function public.my_permissions() from public, anon;
revoke execute on function public.log_admin_action(text, text, text, jsonb) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_contact_change() from public, anon, authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.my_permissions() to authenticated;
grant execute on function public.log_admin_action(text, text, text, jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- הגדרת הבעלים (חד-פעמי)
-- ─────────────────────────────────────────────────────────────

-- מריצים פעם אחת מ-SQL Editor של Supabase אחרי שהבעלים נרשם:
--   select public.bootstrap_owner('owner@example.com');
-- הפונקציה זמינה רק ל-postgres / service_role, לא למשתמשי האפליקציה.
create function public.bootstrap_owner(owner_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if exists (select 1 from public.staff_members where is_owner) then
    raise exception 'owner already exists';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(owner_email);
  if v_user_id is null then
    raise exception 'no user with email %', owner_email;
  end if;

  insert into public.staff_members (user_id, is_owner) values (v_user_id, true);
  insert into public.audit_log (actor_id, action, target_type, target_id)
  values (v_user_id, 'owner.bootstrap', 'user', v_user_id::text);

  return v_user_id;
end;
$$;

revoke execute on function public.bootstrap_owner(text) from public, anon, authenticated;
