-- Kami — עמודים שהצוות יוצר, בקשות בעלות, תיבת פניות ותיעוד הסכמה לתנאים
--
-- עמוד "לא מנוהל": הצוות יוצר עמוד לעסק שקיים ופועל, מתוך מידע ציבורי בלבד
-- (owner_id ריק). בעל העסק האמיתי מבקש בעלות, והבקשה נבדקת ידנית ע"י הצוות
-- (למשל שיחה למספר הטלפון המפורסם של העסק). עד האישור למבקש אין שום הרשאה.
-- בעל עסק יכול גם לבקש להסיר את העמוד.

-- ─────────────────────────────────────────────────────────────
-- עסקים ללא בעלים
-- ─────────────────────────────────────────────────────────────

alter table public.businesses
  alter column owner_id drop not null,
  add column source text not null default 'owner' check (source in ('owner', 'staff')),
  add column created_by uuid references public.profiles (id) on delete set null,
  add column claimed_at timestamptz,
  add column business_terms_accepted_at timestamptz;

-- הגנה: שינוי בעלות רק דרך פונקציות הצוות (security definer).
create or replace function public.guard_business_owner_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.owner_id is distinct from old.owner_id or new.is_featured <> old.is_featured
     or new.plan <> old.plan or new.public_id <> old.public_id or new.source <> old.source
     or new.claimed_at is distinct from old.claimed_at
     or new.created_by is distinct from old.created_by
     or (old.business_terms_accepted_at is not null
         and new.business_terms_accepted_at is distinct from old.business_terms_accepted_at)
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

-- בעל עסק שיוצר עסק בעצמו: תמיד source = owner, ורק אחרי אישור תנאי השימוש לעסקים.
drop policy businesses_insert_owner on public.businesses;
create policy businesses_insert_owner on public.businesses
  for insert to authenticated with check (
    owner_id = auth.uid() and status = 'draft' and not is_featured and plan = 'free'
    and source = 'owner' and created_by is null and claimed_at is null
    and business_terms_accepted_at is not null
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and account_type = 'business_owner'
        and status = 'active' and deleted_at is null
    )
  );

-- יצירה / עריכה של עמוד לא מנוהל ע"י הצוות. עולה לאוויר מיד (מאושר).
create function public.admin_save_unclaimed_business(
  p_id          uuid,
  p_name        text,
  p_category    uuid,
  p_city        text,
  p_address     text,
  p_phone       text,
  p_whatsapp    text,
  p_website     text,
  p_bio         text,
  p_hours       jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.assert_permission('businesses.edit');

  if p_id is null then
    insert into public.businesses (
      owner_id, source, created_by, category_id, name, city, address, phone, whatsapp,
      website, bio, hours, status, approved_at
    ) values (
      null, 'staff', auth.uid(), p_category, trim(p_name), nullif(trim(p_city), ''),
      nullif(trim(p_address), ''), nullif(trim(p_phone), ''), nullif(trim(p_whatsapp), ''),
      nullif(trim(p_website), ''), nullif(trim(p_bio), ''), coalesce(p_hours, '{}'), 'approved', now()
    )
    returning id into v_id;
    perform public.log_admin_action('business.create_unclaimed', 'business', v_id::text,
      jsonb_build_object('name', trim(p_name)));
  else
    update public.businesses
    set name = trim(p_name), category_id = p_category, city = nullif(trim(p_city), ''),
        address = nullif(trim(p_address), ''), phone = nullif(trim(p_phone), ''),
        whatsapp = nullif(trim(p_whatsapp), ''), website = nullif(trim(p_website), ''),
        bio = nullif(trim(p_bio), ''), hours = coalesce(p_hours, hours)
    where id = p_id and owner_id is null
    returning id into v_id;
    if v_id is null then
      raise exception 'business not found or already claimed' using errcode = 'P0002';
    end if;
    perform public.log_admin_action('business.update_unclaimed', 'business', v_id::text,
      jsonb_build_object('name', trim(p_name)));
  end if;
  return v_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- בקשות בעלות / הסרה
-- ─────────────────────────────────────────────────────────────

create table public.business_claims (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('claim', 'removal')),
  full_name    text not null check (char_length(full_name) between 2 and 80),
  role         text not null check (char_length(role) between 2 and 60),
  phone        text not null check (char_length(phone) between 9 and 20),
  message      text check (char_length(message) <= 1000),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by  uuid references public.profiles (id) on delete set null,
  reviewed_at  timestamptz,
  review_note  text,
  created_at   timestamptz not null default now()
);

create index business_claims_status_idx on public.business_claims (status, created_at);
create unique index business_claims_one_pending
  on public.business_claims (business_id, user_id, kind) where status = 'pending';

alter table public.business_claims enable row level security;

create policy claims_select_own on public.business_claims
  for select to authenticated using (user_id = auth.uid());
create policy claims_select_staff on public.business_claims
  for select to authenticated using (public.has_permission('businesses.approve'));
revoke insert, update, delete on public.business_claims from anon, authenticated;

-- הגשת בקשה. בעלות: רק חשבון "בעל עסק" בלי עסק קיים, על עמוד לא מנוהל.
create function public.request_business_claim(
  p_business    uuid,
  p_kind        text,
  p_full_name   text,
  p_role        text,
  p_phone       text,
  p_message     text,
  p_declaration boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_id uuid;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null or v_profile.status <> 'active' or v_profile.deleted_at is not null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not coalesce(p_declaration, false) then
    raise exception 'declaration required' using errcode = '22023';
  end if;
  if p_kind not in ('claim', 'removal') then
    raise exception 'invalid kind' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.businesses
    where id = p_business and owner_id is null and status = 'approved'
  ) then
    raise exception 'business not claimable' using errcode = 'P0002';
  end if;
  if p_kind = 'claim' then
    if v_profile.account_type <> 'business_owner' then
      raise exception 'business account required' using errcode = '42501', hint = 'account_type';
    end if;
    if exists (select 1 from public.businesses where owner_id = auth.uid()) then
      raise exception 'already owns a business' using errcode = '42501', hint = 'has_business';
    end if;
  end if;
  if cardinality(public.find_profanity(concat_ws(' ', p_full_name, p_role, p_message))) > 0 then
    raise exception 'profanity' using errcode = 'P0001', hint = 'profanity';
  end if;

  insert into public.business_claims (business_id, user_id, kind, full_name, role, phone, message)
  values (p_business, auth.uid(), p_kind, trim(p_full_name), trim(p_role), trim(p_phone),
          nullif(trim(p_message), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- החלטת הצוות. אישור בעלות מעביר את העמוד למבקש; אישור הסרה מסיר את העמוד.
create function public.admin_review_claim(p_claim uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim public.business_claims;
begin
  perform public.assert_permission('businesses.approve');
  select * into v_claim from public.business_claims where id = p_claim for update;
  if v_claim.id is null or v_claim.status <> 'pending' then
    raise exception 'claim not found' using errcode = 'P0002';
  end if;

  if p_approve then
    if v_claim.kind = 'claim' then
      if exists (select 1 from public.businesses where owner_id = v_claim.user_id) then
        raise exception 'user already owns a business' using errcode = '22023';
      end if;
      update public.businesses
      set owner_id = v_claim.user_id, claimed_at = now(),
          business_terms_accepted_at = v_claim.created_at -- הצהרת המבקש כוללת את תנאי העסקים
      where id = v_claim.business_id and owner_id is null;
      if not found then
        raise exception 'business already claimed' using errcode = '22023';
      end if;
      -- שאר הבקשות על אותו עסק נדחות
      update public.business_claims
      set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
          review_note = 'העסק שויך לבעלים אחר'
      where business_id = v_claim.business_id and status = 'pending' and id <> v_claim.id;
    else
      update public.businesses
      set status = 'removed', status_reason = 'הוסר לבקשת בעל העסק'
      where id = v_claim.business_id;
    end if;
  end if;

  update public.business_claims
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(p_note), '')
  where id = p_claim;

  perform public.log_admin_action(
    'business.' || v_claim.kind || case when p_approve then '_approved' else '_rejected' end,
    'business', v_claim.business_id::text,
    jsonb_build_object('claim_id', v_claim.id, 'user_id', v_claim.user_id, 'note', nullif(trim(p_note), '')));
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- תיבת פניות (צור קשר, בקשות פרטיות, דיווחים, נגישות)
-- ─────────────────────────────────────────────────────────────

insert into public.permissions (key, group_key, label, description, sort_order) values
  ('inbox.manage', 'general', 'טיפול בפניות', 'צור קשר, בקשות פרטיות, דיווחים ונגישות', 30);

insert into public.staff_role_permissions (role_id, permission_key)
select id, 'inbox.manage' from public.staff_roles where key = 'customer_support';

create table public.contact_requests (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('general', 'privacy', 'report', 'accessibility', 'business')),
  name        text not null check (char_length(name) between 2 and 80),
  email       text not null check (char_length(email) between 5 and 120),
  phone       text check (char_length(phone) <= 20),
  message     text not null check (char_length(message) between 5 and 3000),
  page_url    text check (char_length(page_url) <= 300),
  user_id     uuid references public.profiles (id) on delete set null,
  status      text not null default 'new' check (status in ('new', 'handled')),
  handled_by  uuid references public.profiles (id) on delete set null,
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index contact_requests_status_idx on public.contact_requests (status, created_at desc);

alter table public.contact_requests enable row level security;
create policy contact_select_staff on public.contact_requests
  for select to authenticated using (public.has_permission('inbox.manage'));
revoke insert, update, delete on public.contact_requests from anon, authenticated;

-- פתוח גם לגולשים לא מחוברים. מגבלה פשוטה נגד הצפה: 5 פניות לשעה לכל מייל.
create function public.submit_contact_request(
  p_kind     text,
  p_name     text,
  p_email    text,
  p_phone    text,
  p_message  text,
  p_page_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_email text := lower(trim(p_email));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if (select count(*) from public.contact_requests
      where lower(email) = v_email and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate limited' using errcode = '22023', hint = 'rate_limited';
  end if;

  insert into public.contact_requests (kind, name, email, phone, message, page_url, user_id)
  values (p_kind, trim(p_name), v_email, nullif(trim(p_phone), ''), trim(p_message),
          nullif(trim(p_page_url), ''), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create function public.admin_set_contact_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('inbox.manage');
  update public.contact_requests
  set status = p_status,
      handled_by = case when p_status = 'handled' then auth.uid() end,
      handled_at = case when p_status = 'handled' then now() end
  where id = p_id;
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  perform public.log_admin_action('contact.' || p_status, 'contact', p_id::text);
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- תיעוד הסכמה לתנאי השימוש ולדיוור (חוק התקשורת, סעיף 30א)
-- ─────────────────────────────────────────────────────────────

alter table public.profiles
  add column terms_version text,
  add column terms_accepted_at timestamptz,
  add column marketing_consent boolean not null default false,
  add column marketing_consent_at timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_terms text := nullif(new.raw_user_meta_data ->> 'terms_version', '');
  v_marketing boolean := coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false);
begin
  insert into public.profiles (
    id, email, phone, full_name, account_type,
    terms_version, terms_accepted_at, marketing_consent, marketing_consent_at
  )
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'account_type' = 'business_owner'
      then 'business_owner'::public.account_type
      else 'pet_owner'::public.account_type
    end,
    v_terms,
    case when v_terms is not null then now() end,
    v_marketing,
    case when v_marketing then now() end
  );
  return new;
end;
$$;

-- משתמש יכול לבטל או לתת הסכמה לדיוור בעצמו.
create function public.set_marketing_consent(p_consent boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set marketing_consent = p_consent, marketing_consent_at = now()
  where id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────
-- חיפוש: מחזיר גם האם העמוד לא מנוהל (כדי לא להציג "עסק מאושר" ולא לנחש וואטסאפ)
-- ─────────────────────────────────────────────────────────────

drop function public.search_businesses(text, uuid, double precision, double precision, double precision, boolean, uuid[], jsonb, int, int);

create function public.search_businesses(
  p_text           text default null,
  p_category       uuid default null,
  p_lat            double precision default null,
  p_lng            double precision default null,
  p_radius_km      double precision default null,
  p_open_now       boolean default false,
  p_bool_filters   uuid[] default '{}',
  p_option_filters jsonb default '{}',
  p_limit          int default 24,
  p_offset         int default 0
)
returns table (
  id             uuid,
  public_id      bigint,
  name           text,
  tagline        text,
  city           text,
  category_name  text,
  category_icon  text,
  avatar_path    text,
  cover_path     text,
  phone          text,
  whatsapp       text,
  hours          jsonb,
  is_featured    boolean,
  plan           text,
  distance_km    double precision,
  features       text[],
  total_count    bigint,
  unclaimed      boolean
)
language sql
stable
set search_path = ''
as $$
  with tokens as (
    select t from regexp_split_to_table(lower(trim(coalesce(p_text, ''))), '\s+') t
    where char_length(t) >= 2
  ),
  base as (
    select b.*, c.name as cat_name, c.icon as cat_icon,
      case when p_lat is not null and b.lat is not null
        then public.distance_km(p_lat, p_lng, b.lat, b.lng) end as dist
    from public.businesses b
    join public.categories c on c.id = b.category_id
    where b.status = 'approved'
      and c.is_visible
      and (p_category is null or b.category_id = p_category)
      and not exists (
        select 1 from tokens
        where lower(concat_ws(' ', b.name, b.tagline, b.bio, b.city, b.service_area, c.name))
              not like '%' || tokens.t || '%'
      )
      and (not p_open_now or public.is_open_at(b.hours))
      and not exists (
        select 1 from unnest(p_bool_filters) f
        where not exists (
          select 1 from public.business_filter_values v
          where v.business_id = b.id and v.filter_id = f and v.bool_value
        )
      )
      and not exists (
        select 1 from jsonb_each(p_option_filters) o
        where not exists (
          select 1 from public.business_filter_values v
          where v.business_id = b.id and v.filter_id = o.key::uuid
            and v.option_values && array(select jsonb_array_elements_text(o.value))
        )
      )
  ),
  within as (
    select * from base
    where p_radius_km is null or (dist is not null and dist <= p_radius_km)
  )
  select w.id, w.public_id, w.name, w.tagline, w.city, w.cat_name, w.cat_icon,
         w.avatar_path, w.cover_path, w.phone, w.whatsapp, w.hours, w.is_featured, w.plan,
         round(w.dist::numeric, 1)::double precision,
         array(
           select f.name from public.business_filter_values v
           join public.filters f on f.id = v.filter_id
           where v.business_id = w.id and f.is_visible and v.bool_value
           order by f.sort_order limit 3
         ),
         count(*) over (),
         w.owner_id is null
  from within w
  order by (w.plan = 'pro') desc, w.is_featured desc, w.dist asc nulls last, w.approved_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;


grant execute on function public.search_businesses(text, uuid, double precision, double precision, double precision, boolean, uuid[], jsonb, int, int) to anon, authenticated;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.admin_save_unclaimed_business(uuid, text, uuid, text, text, text, text, text, text, jsonb)',
    'public.request_business_claim(uuid, text, text, text, text, text, boolean)',
    'public.admin_review_claim(uuid, boolean, text)',
    'public.admin_set_contact_status(uuid, text)',
    'public.set_marketing_consent(boolean)'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end;
$$;

revoke execute on function public.submit_contact_request(text, text, text, text, text, text) from public;
grant execute on function public.submit_contact_request(text, text, text, text, text, text) to anon, authenticated;
