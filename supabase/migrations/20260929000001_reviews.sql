-- Kami — ביקורות ודיווחים (שלב 5)
--
-- ביקורת עולה לאתר מיד. משתמשים ובעלי עסקים מדווחים על ביקורת לא הולמת,
-- והדיווחים מגיעים לתור בפאנל (הרשאה reviews.moderate). ביקורת שקיבלה 3
-- דיווחים מוסתרת אוטומטית עד להחלטת הצוות.
-- בעל העסק לא יכול למחוק ביקורת, רק להגיב עליה בפומבי.
-- אין ביקורות על עמודים לא מנוהלים (עד שבעל העסק מקבל בעלות).

-- ─────────────────────────────────────────────────────────────
-- טבלאות
-- ─────────────────────────────────────────────────────────────

create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  author_name   text not null check (char_length(author_name) between 1 and 40), -- "דנה כ."
  rating        smallint not null check (rating between 1 and 5),
  body          text not null check (char_length(body) between 10 and 1500),
  -- published: מוצגת · hidden: הוסתרה אוטומטית אחרי דיווחים · removed: הוסרה ע"י הצוות
  status        text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  status_reason text,
  reply         text check (char_length(reply) <= 1000),   -- תגובת בעל העסק
  reply_at      timestamptz,
  edited_at     timestamptz,
  created_at    timestamptz not null default now(),
  unique (business_id, user_id)
);

create index reviews_business_idx on public.reviews (business_id, created_at desc) where status = 'published';
create index reviews_user_idx on public.reviews (user_id);

create table public.review_reports (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      text not null check (reason in ('offensive', 'fake', 'spam', 'privacy', 'irrelevant', 'other')),
  note        text check (char_length(note) <= 500),
  status      text not null default 'open' check (status in ('open', 'upheld', 'dismissed')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (review_id, reporter_id)
);

create index review_reports_open_idx on public.review_reports (review_id) where status = 'open';

-- ממוצע ומספר ביקורות על העסק (מתעדכנים בטריגר, רק ביקורות מוצגות נספרות)
alter table public.businesses
  add column rating_avg   numeric(2, 1),
  add column review_count int not null default 0;

create function public.refresh_business_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business uuid := coalesce(new.business_id, old.business_id);
begin
  update public.businesses b
  set rating_avg = s.avg, review_count = s.cnt
  from (
    select round(avg(rating)::numeric, 1) as avg, count(*)::int as cnt
    from public.reviews
    where business_id = v_business and status = 'published'
  ) s
  where b.id = v_business;
  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update of rating, status or delete on public.reviews
  for each row execute function public.refresh_business_rating();

-- בעל העסק לא יכול לשנות את הדירוג בעצמו.
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
     or new.rating_avg is distinct from old.rating_avg
     or new.review_count <> old.review_count
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

-- ─────────────────────────────────────────────────────────────
-- RLS — אין כתיבה ישירה, רק דרך הפונקציות למטה
-- ─────────────────────────────────────────────────────────────

alter table public.reviews        enable row level security;
alter table public.review_reports enable row level security;

create policy reviews_select_public on public.reviews
  for select to anon, authenticated
  using (status = 'published' and public.is_business_public(business_id));
create policy reviews_select_own on public.reviews
  for select to authenticated using (user_id = auth.uid());
create policy reviews_select_staff on public.reviews
  for select to authenticated using (public.has_permission('reviews.moderate'));
revoke insert, update, delete on public.reviews from anon, authenticated;

create policy review_reports_select_own on public.review_reports
  for select to authenticated using (reporter_id = auth.uid());
create policy review_reports_select_staff on public.review_reports
  for select to authenticated using (public.has_permission('reviews.moderate'));
revoke insert, update, delete on public.review_reports from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- פעולות משתמשים
-- ─────────────────────────────────────────────────────────────

-- כתיבה או עריכה של הביקורת שלי (ביקורת אחת לכל עסק).
create function public.submit_review(p_business uuid, p_rating int, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile  public.profiles;
  v_business public.businesses;
  v_existing public.reviews;
  v_name     text;
  v_id       uuid;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null or v_profile.status <> 'active' or v_profile.deleted_at is not null then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_business from public.businesses where id = p_business;
  if v_business.id is null or v_business.status <> 'approved' then
    raise exception 'business not found' using errcode = 'P0002';
  end if;
  if v_business.owner_id is null then
    raise exception 'unclaimed business' using errcode = '42501', hint = 'unclaimed';
  end if;
  if v_business.owner_id = auth.uid() then
    raise exception 'own business' using errcode = '42501', hint = 'own_business';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'invalid rating' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 10 and 1500 then
    raise exception 'invalid body' using errcode = '22023', hint = 'body_length';
  end if;
  if cardinality(public.find_profanity(p_body)) > 0 then
    raise exception 'profanity' using errcode = 'P0001', hint = 'profanity';
  end if;

  select * into v_existing from public.reviews where business_id = p_business and user_id = auth.uid();

  if v_existing.id is not null then
    if v_existing.status = 'removed' then
      raise exception 'review removed' using errcode = '42501', hint = 'removed';
    end if;
    update public.reviews
    set rating = p_rating, body = trim(p_body), edited_at = now()
    where id = v_existing.id;
    return v_existing.id;
  end if;

  -- נגד הצפה: עד 10 ביקורות ביום למשתמש
  if (select count(*) from public.reviews
      where user_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'rate limited' using errcode = '22023', hint = 'rate_limited';
  end if;

  -- שם פרטי + אות ראשונה של שם המשפחה
  v_name := nullif(trim(v_profile.full_name), '');
  if v_name is null then
    v_name := 'משתמש/ת';
  elsif position(' ' in v_name) > 0 then
    v_name := split_part(v_name, ' ', 1) || ' '
      || left(split_part(v_name, ' ', array_length(regexp_split_to_array(v_name, '\s+'), 1)), 1) || '.';
  end if;

  insert into public.reviews (business_id, user_id, author_name, rating, body)
  values (p_business, auth.uid(), left(v_name, 40), p_rating, trim(p_body))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.delete_my_review(p_review uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.reviews where id = p_review and user_id = auth.uid() and status <> 'removed';
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;
end;
$$;

-- תגובה פומבית של בעל העסק. טקסט ריק מוחק את התגובה.
create function public.reply_to_review(p_review uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reply text := nullif(trim(coalesce(p_reply, '')), '');
begin
  if not exists (
    select 1 from public.reviews r
    where r.id = p_review and public.owns_business(r.business_id)
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if char_length(v_reply) > 1000 then
    raise exception 'too long' using errcode = '22023';
  end if;
  if v_reply is not null and cardinality(public.find_profanity(v_reply)) > 0 then
    raise exception 'profanity' using errcode = 'P0001', hint = 'profanity';
  end if;
  update public.reviews
  set reply = v_reply, reply_at = case when v_reply is null then null else now() end
  where id = p_review;
end;
$$;

-- דיווח על ביקורת. 3 דיווחים פתוחים → הביקורת מוסתרת עד להחלטת הצוות.
create function public.report_review(p_review uuid, p_reason text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.reviews;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active' and deleted_at is null
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into v_review from public.reviews where id = p_review and status = 'published';
  if v_review.id is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  if v_review.user_id = auth.uid() then
    raise exception 'own review' using errcode = '42501', hint = 'own_review';
  end if;

  insert into public.review_reports (review_id, reporter_id, reason, note)
  values (p_review, auth.uid(), p_reason, nullif(trim(p_note), ''));

  if (select count(*) from public.review_reports where review_id = p_review and status = 'open') >= 3 then
    update public.reviews
    set status = 'hidden', status_reason = 'הוסתרה אוטומטית אחרי כמה דיווחים'
    where id = p_review;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- החלטת הצוות
-- ─────────────────────────────────────────────────────────────

-- keep: הביקורת תקינה (מוצגת שוב, הדיווחים נדחים)
-- remove: הביקורת מוסרת (הדיווחים מתקבלים). המחבר לא יכול לפרסם אותה שוב.
create function public.admin_moderate_review(p_review uuid, p_action text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.reviews;
begin
  perform public.assert_permission('reviews.moderate');
  if p_action not in ('keep', 'remove') then
    raise exception 'invalid action' using errcode = '22023';
  end if;
  select * into v_review from public.reviews where id = p_review for update;
  if v_review.id is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  if p_action = 'remove' and nullif(trim(p_reason), '') is null then
    raise exception 'reason required' using errcode = '22023';
  end if;

  update public.reviews
  set status = case when p_action = 'keep' then 'published' else 'removed' end,
      status_reason = case when p_action = 'keep' then null else trim(p_reason) end
  where id = p_review;

  update public.review_reports
  set status = case when p_action = 'keep' then 'dismissed' else 'upheld' end,
      resolved_by = auth.uid(), resolved_at = now()
  where review_id = p_review and status = 'open';

  perform public.log_admin_action(
    'review.' || p_action, 'review', p_review::text,
    jsonb_build_object('business_id', v_review.business_id, 'author', v_review.user_id,
                       'rating', v_review.rating, 'reason', nullif(trim(p_reason), '')));
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- חיפוש: מחזיר גם דירוג ומספר ביקורות
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
  unclaimed      boolean,
  rating_avg     numeric,
  review_count   int
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
         w.owner_id is null,
         w.rating_avg,
         w.review_count
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
    'public.submit_review(uuid, int, text)',
    'public.delete_my_review(uuid)',
    'public.reply_to_review(uuid, text)',
    'public.report_review(uuid, text, text)',
    'public.admin_moderate_review(uuid, text, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end;
$$;

revoke execute on function public.refresh_business_rating() from public, anon, authenticated;
