-- Kami — מודעות, ימי אימוץ ופופאפ
--
-- מיקומים (ad_placements): דף הבית, עמודי קטגוריה, תוצאות חיפוש — עד 3 מודעות
-- מתחלפות לכל יום — ופופאפ בכניסה לאתר (אחד ליום, יקר יותר).
-- קמפיין (ad_campaigns) רץ בימים שנבחרו (ad_campaign_days), לא בהכרח רצופים.
-- ימים שמורים: חוק קבוע לפי יום בשבוע (ad_weekday_rules) + תאריכים מיוחדים
-- (ad_date_rules), למשל "שישי-שבת לאימוץ", "ערב חג לפרסום".
-- ימי אימוץ הם קמפיין מסוג adoption (לעמותות, בחינם, תמורת פרסום אצלן).
-- הסכום ששולם (ad_payments) גלוי רק לבעלים.
-- "היום" = התאריך בישראל.

create function public.israel_today()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'Asia/Jerusalem')::date $$;

-- ─────────────────────────────────────────────────────────────
-- מיקומים
-- ─────────────────────────────────────────────────────────────

create table public.ad_placements (
  key           text primary key,
  label         text not null,
  kind          text not null check (kind in ('banner', 'popup')),
  capacity      int  not null check (capacity between 1 and 10),
  image_width   int  not null,
  image_height  int  not null,
  mobile_width  int,
  mobile_height int,
  is_active     boolean not null default true,
  sort_order    int not null default 0
);

insert into public.ad_placements (key, label, kind, capacity, image_width, image_height, mobile_width, mobile_height, sort_order) values
  ('home',     'דף הבית — מתחת לחיפוש',        'banner', 3, 1200, 480,  1080, 1080, 1),
  ('category', 'עמודי קטגוריה — בראש העמוד',    'banner', 3, 1200, 480,  1080, 1080, 2),
  ('search',   'תוצאות חיפוש — בין הכרטיסים',   'banner', 3, 1200, 480,  1080, 1080, 3),
  ('popup',    'פופאפ בכניסה לאתר',             'popup',  1, 1080, 1920, null, null, 4);

-- ─────────────────────────────────────────────────────────────
-- ימים שמורים
-- ─────────────────────────────────────────────────────────────

create table public.ad_weekday_rules (
  weekday      smallint primary key check (weekday between 0 and 6), -- 0 = ראשון
  reserved_for text not null check (reserved_for in ('adoption', 'ads'))
);

create table public.ad_date_rules (
  day          date primary key,
  reserved_for text not null check (reserved_for in ('adoption', 'ads', 'open')), -- open = מבטל את החוק הקבוע
  label        text check (char_length(label) <= 60)
);

-- למה שמור יום מסוים: תאריך מיוחד גובר על החוק הקבוע. null = פנוי לכולם.
create function public.ad_day_reservation(p_day date)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select nullif(reserved_for, 'open') from public.ad_date_rules where day = p_day),
    case when exists (select 1 from public.ad_date_rules where day = p_day) then null
         else (select reserved_for from public.ad_weekday_rules where weekday = extract(dow from p_day)) end
  )
$$;

-- ─────────────────────────────────────────────────────────────
-- קמפיינים
-- ─────────────────────────────────────────────────────────────

create table public.ad_campaigns (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null default 'ad' check (kind in ('ad', 'adoption')),
  placement         text not null references public.ad_placements (key),
  advertiser        text not null check (char_length(advertiser) between 2 and 80),
  contact_name      text check (char_length(contact_name) <= 80),
  contact_phone     text check (char_length(contact_phone) <= 20),
  contact_email     text check (char_length(contact_email) <= 120),
  link_url          text check (link_url ~ '^https?://' and char_length(link_url) <= 500),
  alt_text          text not null check (char_length(alt_text) between 2 and 150), -- תיאור לקוראי מסך
  image_path        text not null,
  mobile_image_path text,
  status            text not null default 'active' check (status in ('active', 'paused')),
  notes             text check (char_length(notes) <= 1000),
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.ad_campaign_days (
  campaign_id uuid not null references public.ad_campaigns (id) on delete cascade,
  day         date not null,
  primary key (campaign_id, day)
);
create index ad_campaign_days_day_idx on public.ad_campaign_days (day);

create table public.ad_payments (
  campaign_id uuid primary key references public.ad_campaigns (id) on delete cascade,
  amount      numeric(10, 2) not null check (amount >= 0),
  note        text check (char_length(note) <= 300),
  recorded_by uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table public.ad_stats (
  campaign_id uuid not null references public.ad_campaigns (id) on delete cascade,
  day         date not null,
  impressions bigint not null default 0,
  clicks      bigint not null default 0,
  primary key (campaign_id, day)
);

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────

alter table public.ad_placements    enable row level security;
alter table public.ad_weekday_rules enable row level security;
alter table public.ad_date_rules    enable row level security;
alter table public.ad_campaigns     enable row level security;
alter table public.ad_campaign_days enable row level security;
alter table public.ad_payments      enable row level security;
alter table public.ad_stats         enable row level security;

create policy ad_placements_select on public.ad_placements for select to anon, authenticated using (true);

create policy ad_weekday_rules_select on public.ad_weekday_rules for select to authenticated
  using (public.has_permission('banners.manage') or public.has_permission('banners.reports'));
create policy ad_date_rules_select on public.ad_date_rules for select to authenticated
  using (public.has_permission('banners.manage') or public.has_permission('banners.reports'));
create policy ad_campaigns_select on public.ad_campaigns for select to authenticated
  using (public.has_permission('banners.manage') or public.has_permission('banners.reports'));
create policy ad_campaign_days_select on public.ad_campaign_days for select to authenticated
  using (public.has_permission('banners.manage') or public.has_permission('banners.reports'));
create policy ad_stats_select on public.ad_stats for select to authenticated
  using (public.has_permission('banners.manage') or public.has_permission('banners.reports'));
-- הכנסות: רק הבעלים
create policy ad_payments_select on public.ad_payments for select to authenticated using (public.is_owner());

revoke insert, update, delete on
  public.ad_placements, public.ad_weekday_rules, public.ad_date_rules, public.ad_campaigns,
  public.ad_campaign_days, public.ad_payments, public.ad_stats
from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- ניהול
-- ─────────────────────────────────────────────────────────────

create function public.admin_set_weekday_rule(p_weekday int, p_reserved text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('banners.manage');
  if p_reserved is null then
    delete from public.ad_weekday_rules where weekday = p_weekday;
  else
    insert into public.ad_weekday_rules (weekday, reserved_for) values (p_weekday, p_reserved)
    on conflict (weekday) do update set reserved_for = excluded.reserved_for;
  end if;
  perform public.log_admin_action('ads.weekday_rule', 'weekday', p_weekday::text,
    jsonb_build_object('reserved_for', p_reserved));
end;
$$;

create function public.admin_set_date_rule(p_day date, p_reserved text, p_label text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('banners.manage');
  if p_reserved is null then
    delete from public.ad_date_rules where day = p_day;
  else
    insert into public.ad_date_rules (day, reserved_for, label)
    values (p_day, p_reserved, nullif(trim(p_label), ''))
    on conflict (day) do update set reserved_for = excluded.reserved_for, label = excluded.label;
  end if;
  perform public.log_admin_action('ads.date_rule', 'date', p_day::text,
    jsonb_build_object('reserved_for', p_reserved, 'label', p_label));
end;
$$;

create function public.admin_update_placement(p_key text, p_capacity int, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('banners.manage');
  update public.ad_placements set capacity = p_capacity, is_active = p_active where key = p_key;
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  perform public.log_admin_action('ads.placement', 'placement', p_key,
    jsonb_build_object('capacity', p_capacity, 'active', p_active));
end;
$$;

-- ימים שבהם אין מקום (המיקום מלא) או שהם שמורים לסוג אחר.
create function public.ad_conflicts(p_campaign uuid, p_placement text, p_kind text, p_days date[])
returns table (day date, problem text, detail text)
language sql
stable
security definer
set search_path = ''
as $$
  with d as (select unnest(p_days) as day),
  cap as (select capacity from public.ad_placements where key = p_placement)
  select d.day, 'full', string_agg(c.advertiser, ', ')
  from d
  join public.ad_campaign_days cd on cd.day = d.day
  join public.ad_campaigns c on c.id = cd.campaign_id
  where c.placement = p_placement and c.status = 'active' and c.id is distinct from p_campaign
    and public.has_permission('banners.manage')
  group by d.day
  having count(*) >= (select capacity from cap)
  union all
  select d.day, 'reserved', public.ad_day_reservation(d.day)
  from d
  where public.has_permission('banners.manage')
    and public.ad_day_reservation(d.day) is not null
    and public.ad_day_reservation(d.day) <> case when p_kind = 'adoption' then 'adoption' else 'ads' end
  order by 1
$$;

-- יצירה / עריכה. p_force = להתעלם מימים שמורים (אבל לא ממיקום מלא).
create function public.admin_save_ad_campaign(
  p_id     uuid,
  p_data   jsonb,
  p_days   date[],
  p_price  numeric,
  p_force  boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_kind text := coalesce(p_data ->> 'kind', 'ad');
  v_placement text := p_data ->> 'placement';
  v_days date[] := array(select distinct unnest(p_days) order by 1);
  v_full text;
  v_reserved text;
begin
  perform public.assert_permission('banners.manage');
  if cardinality(v_days) = 0 then
    raise exception 'no days' using errcode = '22023', hint = 'no_days';
  end if;
  if cardinality(v_days) > 366 then
    raise exception 'too many days' using errcode = '22023';
  end if;

  if coalesce(p_data ->> 'status', 'active') = 'active' then
    select string_agg(to_char(day, 'DD/MM'), ', ') into v_full
    from public.ad_conflicts(p_id, v_placement, v_kind, v_days) where problem = 'full';
    if v_full is not null then
      raise exception 'placement full' using errcode = '22023', hint = 'full', detail = v_full;
    end if;
    if not coalesce(p_force, false) then
      select string_agg(to_char(day, 'DD/MM'), ', ') into v_reserved
      from public.ad_conflicts(p_id, v_placement, v_kind, v_days) where problem = 'reserved';
      if v_reserved is not null then
        raise exception 'reserved days' using errcode = '22023', hint = 'reserved', detail = v_reserved;
      end if;
    end if;
  end if;

  if p_id is null then
    insert into public.ad_campaigns (
      kind, placement, advertiser, contact_name, contact_phone, contact_email, link_url,
      alt_text, image_path, mobile_image_path, status, notes, created_by
    ) values (
      v_kind, v_placement, trim(p_data ->> 'advertiser'),
      nullif(trim(p_data ->> 'contact_name'), ''), nullif(trim(p_data ->> 'contact_phone'), ''),
      nullif(trim(p_data ->> 'contact_email'), ''), nullif(trim(p_data ->> 'link_url'), ''),
      trim(p_data ->> 'alt_text'), p_data ->> 'image_path', nullif(p_data ->> 'mobile_image_path', ''),
      coalesce(p_data ->> 'status', 'active'), nullif(trim(p_data ->> 'notes'), ''), auth.uid()
    )
    returning id into v_id;
  else
    update public.ad_campaigns set
      kind = v_kind, placement = v_placement, advertiser = trim(p_data ->> 'advertiser'),
      contact_name = nullif(trim(p_data ->> 'contact_name'), ''),
      contact_phone = nullif(trim(p_data ->> 'contact_phone'), ''),
      contact_email = nullif(trim(p_data ->> 'contact_email'), ''),
      link_url = nullif(trim(p_data ->> 'link_url'), ''),
      alt_text = trim(p_data ->> 'alt_text'), image_path = p_data ->> 'image_path',
      mobile_image_path = nullif(p_data ->> 'mobile_image_path', ''),
      status = coalesce(p_data ->> 'status', 'active'), notes = nullif(trim(p_data ->> 'notes'), ''),
      updated_at = now()
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'not found' using errcode = 'P0002';
    end if;
    delete from public.ad_campaign_days where campaign_id = v_id;
  end if;

  insert into public.ad_campaign_days (campaign_id, day) select v_id, unnest(v_days);

  -- רק הבעלים רושם כמה שולם
  if public.is_owner() then
    if p_price is null then
      delete from public.ad_payments where campaign_id = v_id;
    else
      insert into public.ad_payments (campaign_id, amount, recorded_by) values (v_id, p_price, auth.uid())
      on conflict (campaign_id) do update set amount = excluded.amount, recorded_by = auth.uid(), updated_at = now();
    end if;
  end if;

  perform public.log_admin_action(
    case when p_id is null then 'ads.create' else 'ads.update' end, 'ad_campaign', v_id::text,
    jsonb_build_object('advertiser', trim(p_data ->> 'advertiser'), 'placement', v_placement,
                       'kind', v_kind, 'days', cardinality(v_days), 'forced', coalesce(p_force, false)));
  return v_id;
end;
$$;

create function public.admin_delete_ad_campaign(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  perform public.assert_permission('banners.manage');
  delete from public.ad_campaigns where id = p_id returning advertiser into v_name;
  if v_name is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  perform public.log_admin_action('ads.delete', 'ad_campaign', p_id::text, jsonb_build_object('advertiser', v_name));
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- הצגה באתר ומדידה
-- ─────────────────────────────────────────────────────────────

-- המודעות שרצות היום במיקום. בלי פרטי קשר ובלי מחיר.
create function public.active_ads(p_placement text)
returns table (
  id                uuid,
  kind              text,
  advertiser        text,
  alt_text          text,
  image_path        text,
  mobile_image_path text,
  has_link          boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.kind, c.advertiser, c.alt_text, c.image_path, c.mobile_image_path, c.link_url is not null
  from public.ad_campaigns c
  join public.ad_campaign_days d on d.campaign_id = c.id and d.day = public.israel_today()
  join public.ad_placements p on p.key = c.placement and p.is_active
  where c.placement = p_placement and c.status = 'active'
  order by c.created_at
$$;

-- ספירת חשיפות (מהדפדפן, כשהמודעה נראתה). נספר רק למודעות שרצות היום.
create function public.track_ad_impressions(p_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.ad_stats (campaign_id, day, impressions)
  select c.id, public.israel_today(), 1
  from public.ad_campaigns c
  join public.ad_campaign_days d on d.campaign_id = c.id and d.day = public.israel_today()
  where c.id = any (p_ids[1:10]) and c.status = 'active'
  on conflict (campaign_id, day) do update set impressions = public.ad_stats.impressions + 1
$$;

-- לחיצה: סופרת ומחזירה את הקישור (דרך /go/ad/[id]).
create function public.track_ad_click(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link text;
begin
  select link_url into v_link from public.ad_campaigns where id = p_id;
  if exists (
    select 1 from public.ad_campaign_days
    where campaign_id = p_id and day = public.israel_today()
  ) then
    insert into public.ad_stats (campaign_id, day, clicks) values (p_id, public.israel_today(), 1)
    on conflict (campaign_id, day) do update set clicks = public.ad_stats.clicks + 1;
  end if;
  return v_link;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- אחסון תמונות
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-media', 'ad-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "ad media: staff insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ad-media' and public.has_permission('banners.manage'));
create policy "ad media: staff update" on storage.objects
  for update to authenticated
  using (bucket_id = 'ad-media' and public.has_permission('banners.manage'));
create policy "ad media: staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ad-media' and public.has_permission('banners.manage'));

-- ─────────────────────────────────────────────────────────────
-- הרשאות הרצה
-- ─────────────────────────────────────────────────────────────

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.admin_set_weekday_rule(int, text)',
    'public.admin_set_date_rule(date, text, text)',
    'public.admin_update_placement(text, int, boolean)',
    'public.ad_conflicts(uuid, text, text, date[])',
    'public.admin_save_ad_campaign(uuid, jsonb, date[], numeric, boolean)',
    'public.admin_delete_ad_campaign(uuid)',
    'public.ad_day_reservation(date)'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end;
$$;

grant execute on function public.israel_today() to anon, authenticated;
revoke execute on function public.active_ads(text) from public;
grant execute on function public.active_ads(text) to anon, authenticated;
revoke execute on function public.track_ad_impressions(uuid[]) from public;
grant execute on function public.track_ad_impressions(uuid[]) to anon, authenticated;
revoke execute on function public.track_ad_click(uuid) from public;
grant execute on function public.track_ad_click(uuid) to anon, authenticated;
