-- PetLink — שלב 3: עסקים
--
-- עמוד עסק בסגנון פרופיל: תמונת רקע, תמונת פרופיל, בועת סטטוס, פס הישגים,
-- פרטים, שעות, גלריה ומחירון. שלוש רמות עיצוב: ברירת מחדל ואישי (חינם), PRO (בקרוב).
--
-- מחזור חיים: draft (בעריכה) → pending (נשלח לאישור) → approved (מוצג באתר)
--             approved → suspended (הושהה ע"י הצוות) / removed (הוסר)
--
-- סינון מילים גסות נאכף כאן, בטריגר, כך שאי אפשר לעקוף אותו דרך ה-API.

-- ─────────────────────────────────────────────────────────────
-- סינון מילים גסות
-- ─────────────────────────────────────────────────────────────

-- רשימת המילים. כל ביטוי נשמר מנורמל (ראו normalize_for_profanity).
-- allow_prefix: להתאים גם עם אותיות שימוש בתחילת המילה (ה, ו, ב, ל, מ, ש, כ).
-- כבוי למילים שבהן זה יוצר התאמות שגויות (למשל "זין" ⊂ "מזין").
create table public.banned_terms (
  term         text primary key,
  allow_prefix boolean not null default true
);

alter table public.banned_terms enable row level security;
-- אין גישה ישירה. הבדיקה עוברת דרך find_profanity().

-- נרמול טקסט להשוואה: אותיות קטנות, בלי ניקוד, אותיות סופיות רגילות,
-- ספרות-כאותיות (0→o, 1→i, @→a…), בלי תווי הפרדה בתוך מילה (ז.ו.נ.ה),
-- חיבור אותיות בודדות (ז ו נ ה), וכיווץ אותיות שחוזרות (זוווונה).
create function public.normalize_for_profanity(p_text text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v      text := lower(coalesce(p_text, ''));
  tokens text[];
  token  text;
  result text := '';
  run    text := '';
begin
  v := regexp_replace(v, '[֑-ׇ]', '', 'g');                -- ניקוד וטעמים
  v := translate(v, 'ךםןףץ', 'כמנפצ');                                -- אותיות סופיות
  v := translate(v, '013457@$!', 'oieastasi');                         -- leetspeak
  v := regexp_replace(v, '(?<=[א-תa-z])[*._\-~''"`|+]+(?=[א-תa-z])', '', 'g');
  v := regexp_replace(v, '[^א-תa-z]+', ' ', 'g');

  -- חיבור רצפים של אותיות בודדות: "ז ו נ ה" → "זונה"
  tokens := regexp_split_to_array(trim(v), ' ');
  foreach token in array coalesce(tokens, '{}') loop
    if char_length(token) = 1 then
      run := run || token;
    else
      if run <> '' then result := result || ' ' || run; run := ''; end if;
      result := result || ' ' || token;
    end if;
  end loop;
  if run <> '' then result := result || ' ' || run; end if;

  return regexp_replace(trim(result), '([א-תa-z])\1+', '\1', 'g');
end;
$$;

-- מחזיר את הביטויים האסורים שנמצאו (ריק = נקי).
create function public.find_profanity(p_text text)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(t.term), '{}')
  from public.banned_terms t
  where public.normalize_for_profanity(p_text) ~ (
    '(^| )' || case when t.allow_prefix then '[הובלמשכ]{0,2}' else '' end || t.term || '( |$)'
  );
$$;

grant execute on function public.find_profanity(text) to anon, authenticated;
grant execute on function public.normalize_for_profanity(text) to anon, authenticated;

-- רשימה בסיסית. כל ביטוי עובר נרמול לפני השמירה (אותיות כפולות מתכווצות וכו').
insert into public.banned_terms (term, allow_prefix)
select public.normalize_for_profanity(w), p
from (values
  ('זונה', true), ('זונות', true), ('בן זונה', true), ('בנזונה', true), ('בת זונה', true),
  ('שרמוטה', true), ('שרמוטות', true), ('שרמוט', true), ('אחושרמוטה', true), ('אחו שרמוטה', true),
  ('כוסית', true), ('כוסיות', true), ('כוסאמק', true), ('כוס אמק', true), ('כוסעמק', true),
  ('כוס אמא שלך', true), ('כוסאמאשלך', true), ('כוס אחתק', true), ('כוסאחתק', true), ('כוס רבאק', true),
  ('זין', false), ('זיין', true), ('מזדיין', false), ('מזדיינת', false), ('מזדיינים', false),
  ('תזדיין', false), ('תזדייני', false), ('לזיין', false), ('זיון', true), ('זיונים', true),
  ('חרא', true), ('חארה', true), ('מחורבן', true), ('מניאק', true), ('מאניאק', true),
  ('מניאקים', true), ('יא מניאק', true), ('שמוק', true), ('קוקסינל', true), ('ערס מסריח', true),
  ('fuck', true), ('fucking', true), ('fucker', true), ('fck', true), ('fuk', true),
  ('motherfucker', true), ('shit', true), ('bullshit', true), ('bitch', true), ('bitches', true),
  ('cunt', true), ('dick', true), ('dickhead', true), ('asshole', true), ('whore', true),
  ('slut', true), ('bastard', true), ('pussy', true), ('cock', true), ('wtf', true)
) as t(w, p)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────
-- עסקים
-- ─────────────────────────────────────────────────────────────

create type public.business_status as enum ('draft', 'pending', 'approved', 'suspended', 'removed');

create table public.businesses (
  id                uuid primary key default gen_random_uuid(),
  public_id         bigint generated always as identity (start with 1001) unique, -- /b/1001
  owner_id          uuid not null references public.profiles (id) on delete cascade,
  category_id       uuid not null references public.categories (id),
  status            public.business_status not null default 'draft',
  status_reason     text,
  is_featured       boolean not null default false,

  name              text not null check (char_length(name) between 2 and 60),
  tagline           text check (char_length(tagline) <= 80),   -- בועת הסטטוס
  bio               text check (char_length(bio) <= 1500),      -- "אודות"

  phone             text check (char_length(phone) <= 20),
  whatsapp          text check (char_length(whatsapp) <= 20),
  email             text check (char_length(email) <= 120),
  website           text check (char_length(website) <= 200),
  instagram         text check (char_length(instagram) <= 60),
  facebook          text check (char_length(facebook) <= 200),
  tiktok            text check (char_length(tiktok) <= 60),

  city              text check (char_length(city) <= 60),
  address           text check (char_length(address) <= 120),
  service_area      text check (char_length(service_area) <= 120), -- "כל גוש דן"

  years_experience  int check (years_experience between 0 and 80),
  animals_served    int check (animals_served between 0 and 1000000),
  languages         text[] not null default '{}',
  certifications    text[] not null default '{}' check (cardinality(certifications) <= 12),

  -- שעות: {"0": [["09:00","18:00"]], "1": [...], ...} — 0 = ראשון. יום בלי מפתח = סגור.
  hours             jsonb not null default '{}'::jsonb,
  open_on_holidays  boolean not null default false,

  -- מחירון: [{"title": "...", "price": "150", "note": "..."}]
  price_list        jsonb not null default '[]'::jsonb check (jsonb_array_length(price_list) <= 40),

  avatar_path       text,
  cover_path        text,

  -- עיצוב: {"mode": "default"|"personal", "accent": "teal", "layout": "classic"|"side",
  --          "sections": [{"id": "about", "visible": true}, ...]}
  design            jsonb not null default '{"mode": "default"}'::jsonb,

  plan              text not null default 'free' check (plan in ('free', 'pro')),
  pro_waitlist_at   timestamptz,  -- לחץ "עדכנו אותי" בחלון ה-PRO

  submitted_at      timestamptz,
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index businesses_owner_idx on public.businesses (owner_id);
create index businesses_status_idx on public.businesses (status, created_at desc);
create index businesses_category_idx on public.businesses (category_id) where status = 'approved';

create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

-- ערכי פילטרים של העסק (מגיע לבית, סוגי חיות…)
create table public.business_filter_values (
  business_id uuid not null references public.businesses (id) on delete cascade,
  filter_id   uuid not null references public.filters (id) on delete cascade,
  bool_value  boolean,
  option_values text[] not null default '{}',
  primary key (business_id, filter_id)
);

create table public.business_photos (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  path        text not null,
  caption     text check (char_length(caption) <= 120),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index business_photos_business_idx on public.business_photos (business_id, sort_order);

-- ─────────────────────────────────────────────────────────────
-- אכיפה בטריגרים: מילים גסות, מבנה שדות JSON, מגבלות
-- ─────────────────────────────────────────────────────────────

create function public.check_business_content()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_found text[];
begin
  v_found := public.find_profanity(concat_ws(' ',
    new.name, new.tagline, new.bio, new.city, new.address, new.service_area,
    array_to_string(new.certifications, ' '),
    (select string_agg(concat_ws(' ', i ->> 'title', i ->> 'note', i ->> 'price'), ' ')
     from jsonb_array_elements(new.price_list) i)
  ));
  if cardinality(v_found) > 0 then
    raise exception 'profanity: %', array_to_string(v_found, ', ') using errcode = 'P0001', hint = 'profanity';
  end if;

  if jsonb_typeof(new.hours) <> 'object' or jsonb_typeof(new.price_list) <> 'array'
     or jsonb_typeof(new.design) <> 'object' then
    raise exception 'invalid json shape' using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger businesses_check_content
  before insert or update on public.businesses
  for each row execute function public.check_business_content();

create function public.check_photo_content()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if cardinality(public.find_profanity(new.caption)) > 0 then
    raise exception 'profanity' using errcode = 'P0001', hint = 'profanity';
  end if;
  -- מגבלת גלריה לתוכנית החינמית. PRO (בקרוב) בלי הגבלה.
  if tg_op = 'INSERT' and (
    select count(*) from public.business_photos where business_id = new.business_id
  ) >= 12 and (select plan from public.businesses where id = new.business_id) <> 'pro' then
    raise exception 'gallery limit' using errcode = '22023', hint = 'gallery_limit';
  end if;
  return new;
end;
$$;

create trigger business_photos_check
  before insert or update on public.business_photos
  for each row execute function public.check_photo_content();

-- בעל העסק לא יכול לשנות סטטוס / מומלץ / תוכנית בעצמו.
-- השינויים המותרים בסטטוס: draft→pending (שליחה לאישור) ו-pending→draft (חזרה לעריכה).
create function public.guard_business_owner_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- פונקציות admin_* רצות כ-security definer, כלומר כבעלים של הטבלה ולא כ-authenticated.
  -- רק כתיבה ישירה של משתמש (דרך ה-API) עוברת את הבדיקות.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.owner_id <> old.owner_id or new.is_featured <> old.is_featured
     or new.plan <> old.plan or new.public_id <> old.public_id
     or new.approved_at is distinct from old.approved_at
     or new.status_reason is distinct from old.status_reason then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if new.status <> old.status and not (
    (old.status = 'draft' and new.status = 'pending')
    or (old.status = 'pending' and new.status = 'draft')
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if new.status = 'pending' and old.status = 'draft' then
    new.submitted_at := now();
  end if;
  return new;
end;
$$;

create trigger businesses_guard_owner
  before update on public.businesses
  for each row execute function public.guard_business_owner_update();

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────

alter table public.businesses             enable row level security;
alter table public.business_filter_values enable row level security;
alter table public.business_photos        enable row level security;

-- האם העסק שייך למשתמש הנוכחי (ומשתמש פעיל).
create function public.owns_business(p_business uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.businesses b
    join public.profiles p on p.id = b.owner_id
    where b.id = p_business and b.owner_id = auth.uid()
      and p.status = 'active' and p.deleted_at is null
  );
$$;

create function public.is_business_public(p_business uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.businesses where id = p_business and status = 'approved');
$$;

grant execute on function public.owns_business(uuid) to authenticated;
grant execute on function public.is_business_public(uuid) to anon, authenticated;

create policy businesses_select_public on public.businesses
  for select to anon, authenticated using (status = 'approved');
create policy businesses_select_owner on public.businesses
  for select to authenticated using (owner_id = auth.uid());
create policy businesses_select_staff on public.businesses
  for select to authenticated using (public.has_permission('businesses.view'));

-- רק חשבון "בעל עסק" פעיל יכול ליצור עסק, תמיד כטיוטה.
create policy businesses_insert_owner on public.businesses
  for insert to authenticated with check (
    owner_id = auth.uid() and status = 'draft' and not is_featured and plan = 'free'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and account_type = 'business_owner'
        and status = 'active' and deleted_at is null
    )
  );
create policy businesses_update_owner on public.businesses
  for update to authenticated
  using (public.owns_business(id) and status not in ('suspended', 'removed'))
  with check (owner_id = auth.uid());

revoke delete on public.businesses from anon, authenticated;

-- מדיניות נפרדת לציבור: anon לא מורשה להריץ owns_business / has_permission.
create policy bfv_select_public on public.business_filter_values
  for select to anon, authenticated using (public.is_business_public(business_id));
create policy bfv_select_owner_staff on public.business_filter_values
  for select to authenticated
  using (public.owns_business(business_id) or public.has_permission('businesses.view'));
create policy bfv_write_owner on public.business_filter_values
  for all to authenticated
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));

create policy photos_select_public on public.business_photos
  for select to anon, authenticated using (public.is_business_public(business_id));
create policy photos_select_owner_staff on public.business_photos
  for select to authenticated
  using (public.owns_business(business_id) or public.has_permission('businesses.view'));
create policy photos_write_owner on public.business_photos
  for all to authenticated
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- ─────────────────────────────────────────────────────────────
-- אחסון תמונות: bucket ציבורי, כתיבה רק לתיקיית העסק שלך (<business_id>/...)
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-media', 'business-media', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "business media: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'business-media'
    and public.owns_business(((storage.foldername(name))[1])::uuid));
create policy "business media: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'business-media'
    and public.owns_business(((storage.foldername(name))[1])::uuid));
create policy "business media: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'business-media'
    and public.owns_business(((storage.foldername(name))[1])::uuid));

-- ─────────────────────────────────────────────────────────────
-- פעולות צוות
-- ─────────────────────────────────────────────────────────────

create function public.admin_set_business_status(
  p_id     uuid,
  p_status public.business_status,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.business_status;
begin
  if p_status in ('approved', 'suspended', 'draft') then
    perform public.assert_permission('businesses.approve');
  elsif p_status = 'removed' then
    perform public.assert_permission('businesses.remove');
  else
    raise exception 'invalid status' using errcode = '22023';
  end if;

  select status into v_old from public.businesses where id = p_id for update;
  if v_old is null then
    raise exception 'business not found' using errcode = 'P0002';
  end if;
  if p_status in ('suspended', 'removed', 'draft') and nullif(trim(p_reason), '') is null then
    raise exception 'reason required' using errcode = '22023';
  end if;

  update public.businesses
  set status = p_status,
      status_reason = case when p_status = 'approved' then null else trim(p_reason) end,
      approved_at = case when p_status = 'approved' then coalesce(approved_at, now()) else approved_at end
  where id = p_id;

  perform public.log_admin_action('business.' || p_status::text, 'business', p_id::text,
    jsonb_build_object('from', v_old, 'reason', nullif(trim(p_reason), '')));
end;
$$;

create function public.admin_set_business_featured(p_id uuid, p_featured boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('businesses.feature');
  update public.businesses set is_featured = p_featured where id = p_id;
  if not found then
    raise exception 'business not found' using errcode = 'P0002';
  end if;
  perform public.log_admin_action(
    case when p_featured then 'business.feature' else 'business.unfeature' end,
    'business', p_id::text);
end;
$$;

-- "עדכנו אותי כש-PRO מוכן" — בעל העסק בלבד.
create function public.join_pro_waitlist(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.owns_business(p_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.businesses set pro_waitlist_at = coalesce(pro_waitlist_at, now()) where id = p_id;
end;
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.admin_set_business_status(uuid, public.business_status, text)',
    'public.admin_set_business_featured(uuid, boolean)',
    'public.join_pro_waitlist(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end;
$$;
