-- ─────────────────────────────────────────────────────────────
-- זימון תורים, שלב 1
-- רק לעסקים במנוי (plan = 'pro', כלומר KamiPet ומעלה). תור שלקוח קובע נקבע מיד,
-- בלי אישור ידני. לפני הקביעה הלקוח מאשר את מדיניות הביטול של העסק.
-- הזמינות = שעות הפעילות של העסק (businesses.hours), פחות תורים קיימים.
-- כל השינויים בתורים עוברים דרך פונקציות (אין כתיבה ישירה לטבלה).
-- ─────────────────────────────────────────────────────────────

create extension if not exists btree_gist with schema extensions;

do $$ begin
  create type public.booking_status as enum ('booked', 'cancelled_by_customer', 'cancelled_by_business');
exception when duplicate_object then null;
end $$;

-- הגדרות התורים של העסק
create table if not exists public.booking_settings (
  business_id    uuid primary key references public.businesses (id) on delete cascade,
  enabled        boolean not null default false,
  slot_step_min  int not null default 30 check (slot_step_min in (10, 15, 20, 30, 45, 60)),
  min_notice_min int not null default 120 check (min_notice_min between 0 and 10080),
  max_days_ahead int not null default 30 check (max_days_ahead between 1 and 90),
  cancel_policy  text check (char_length(cancel_policy) <= 800),
  updated_at     timestamptz not null default now()
);

-- השירותים שאפשר להזמין (תספורת, ייעוץ…)
create table if not exists public.booking_services (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text not null check (char_length(name) between 2 and 60),
  duration_min int not null check (duration_min between 10 and 480 and duration_min % 5 = 0),
  price        text check (char_length(price) <= 30),
  note         text check (char_length(note) <= 160),
  sort_order   int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists booking_services_business_idx on public.booking_services (business_id, sort_order);

-- סוף חלק 1

create table if not exists public.bookings (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses (id) on delete cascade,
  customer_id        uuid not null references public.profiles (id) on delete cascade,
  service_id         uuid references public.booking_services (id) on delete set null,
  service_name       text not null,
  duration_min       int not null,
  starts_at          timestamptz not null,
  ends_at            timestamptz not null,
  pet_id             uuid references public.pets (id) on delete set null,
  pet_name           text,
  pet_species        text,
  note               text check (char_length(note) <= 300),
  status             public.booking_status not null default 'booked',
  cancel_reason      text check (char_length(cancel_reason) <= 200),
  cancelled_at       timestamptz,
  policy_accepted_at timestamptz,
  seen_at            timestamptz, -- העסק ראה את התור (לתג "חדש")
  created_at         timestamptz not null default now(),
  check (ends_at > starts_at),
  -- שני תורים פעילים באותו עסק לא חופפים, גם אם שני לקוחות לוחצים באותה שנייה
  constraint bookings_no_overlap exclude using gist (
    business_id with =, tstzrange(starts_at, ends_at) with &&
  ) where (status = 'booked')
);
create index if not exists bookings_business_idx on public.bookings (business_id, starts_at);
create index if not exists bookings_customer_idx on public.bookings (customer_id, starts_at desc);

-- מילים גסות ומגבלות
create or replace function public.check_booking_text()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_found text[];
begin
  if tg_table_name = 'booking_settings' then
    v_found := public.find_profanity(coalesce(new.cancel_policy, ''));
    if new.enabled and not exists (select 1 from public.businesses where id = new.business_id and plan = 'pro') then
      raise exception 'pro required' using errcode = 'P0001', hint = 'pro_required';
    end if;
    new.updated_at := now();
  else
    v_found := public.find_profanity(concat_ws(' ', new.name, new.price, new.note));
    if tg_op = 'INSERT' and (select count(*) from public.booking_services where business_id = new.business_id) >= 20 then
      raise exception 'too many services' using errcode = 'P0001', hint = 'limit';
    end if;
  end if;
  if cardinality(v_found) > 0 then
    raise exception 'profanity: %', array_to_string(v_found, ', ') using errcode = 'P0001', hint = 'profanity';
  end if;
  return new;
end;
$$;

drop trigger if exists booking_settings_check on public.booking_settings;
create trigger booking_settings_check before insert or update on public.booking_settings
  for each row execute function public.check_booking_text();
drop trigger if exists booking_services_check on public.booking_services;
create trigger booking_services_check before insert or update on public.booking_services
  for each row execute function public.check_booking_text();

-- סוף חלק 2

-- ─────────────────────────────────────────────────────────────
-- הרשאות: ההגדרות והשירותים גלויים לכולם (צריך אותם כדי לקבוע תור),
-- והעסק עורך. תורים: הלקוח והעסק רואים, ואין כתיבה ישירה.
-- ─────────────────────────────────────────────────────────────

alter table public.booking_settings enable row level security;
alter table public.booking_services enable row level security;
alter table public.bookings         enable row level security;

drop policy if exists booking_settings_select on public.booking_settings;
create policy booking_settings_select on public.booking_settings
  for select to anon, authenticated using (true);
drop policy if exists booking_settings_write on public.booking_settings;
create policy booking_settings_write on public.booking_settings
  for all to authenticated
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));

drop policy if exists booking_services_select on public.booking_services;
create policy booking_services_select on public.booking_services
  for select to anon, authenticated using (true);
drop policy if exists booking_services_write on public.booking_services;
create policy booking_services_write on public.booking_services
  for all to authenticated
  using (public.owns_business(business_id)) with check (public.owns_business(business_id));

drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings
  for select to authenticated
  using (customer_id = auth.uid() or public.owns_business(business_id));

revoke insert, update, delete on public.bookings from anon, authenticated;

-- סוף חלק 3

-- ─────────────────────────────────────────────────────────────
-- שעות פנויות ליום אחד. מחזירה רשימה ריקה כשהעסק לא מקבל תורים.
-- שעות הפעילות נשמרות בשעון ישראל: {"0": [["09:00","18:00"]], ...} (0 = ראשון).
-- ─────────────────────────────────────────────────────────────

create or replace function public.booking_slots(p_business uuid, p_service uuid, p_day date)
returns setof timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hours  jsonb;
  v_set    public.booking_settings;
  v_dur    int;
  v_range  jsonb;
  v_from   timestamptz;
  v_to     timestamptz;
  v_slot   timestamptz;
  v_today  date := (now() at time zone 'Asia/Jerusalem')::date;
begin
  select b.hours into v_hours
  from public.businesses b
  where b.id = p_business and b.status = 'approved' and b.plan = 'pro';
  select * into v_set from public.booking_settings where business_id = p_business and enabled;
  select duration_min into v_dur from public.booking_services
  where id = p_service and business_id = p_business and active;
  if v_hours is null or v_set.business_id is null or v_dur is null
     or p_day < v_today or p_day > v_today + v_set.max_days_ahead then
    return;
  end if;

  for v_range in select * from jsonb_array_elements(coalesce(v_hours -> extract(dow from p_day)::int::text, '[]'::jsonb)) loop
    v_from := (p_day + (v_range ->> 0)::time) at time zone 'Asia/Jerusalem';
    v_to := (p_day + (v_range ->> 1)::time) at time zone 'Asia/Jerusalem';
    if v_to <= v_from then
      v_to := v_to + interval '1 day'; -- "עד 00:00"
    end if;
    v_slot := v_from;
    while v_slot + make_interval(mins => v_dur) <= v_to loop
      if v_slot >= now() + make_interval(mins => v_set.min_notice_min)
         and not exists (
           select 1 from public.bookings k
           where k.business_id = p_business and k.status = 'booked'
             and tstzrange(k.starts_at, k.ends_at) && tstzrange(v_slot, v_slot + make_interval(mins => v_dur))
         ) then
        return next v_slot;
      end if;
      v_slot := v_slot + make_interval(mins => v_set.slot_step_min);
    end loop;
  end loop;
end;
$$;
revoke execute on function public.booking_slots(uuid, uuid, date) from public;
grant execute on function public.booking_slots(uuid, uuid, date) to anon, authenticated;

-- סוף חלק 4

-- ─────────────────────────────────────────────────────────────
-- קביעת תור (הלקוח). מחזירה את מזהה התור.
-- שגיאות (message): not_available, slot_taken, phone_required, policy_required, too_many, own_business
-- ─────────────────────────────────────────────────────────────

create or replace function public.book_appointment(
  p_business  uuid,
  p_service   uuid,
  p_starts_at timestamptz,
  p_pet       uuid default null,
  p_share_pet boolean default false,
  p_note      text default null,
  p_policy_ok boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_service public.booking_services;
  v_policy  text;
  v_pet     public.pets;
  v_id      uuid;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid and status = 'active' and deleted_at is null) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if exists (select 1 from public.businesses where id = p_business and owner_id = v_uid) then
    raise exception 'own_business' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and nullif(trim(phone), '') is not null) then
    raise exception 'phone_required' using errcode = 'P0001';
  end if;

  select cancel_policy into v_policy from public.booking_settings where business_id = p_business;
  if nullif(trim(v_policy), '') is not null and not p_policy_ok then
    raise exception 'policy_required' using errcode = 'P0001';
  end if;

  -- נגד הצפה: עד 3 תורים עתידיים בעסק, ועד 10 קביעות ביממה
  if (select count(*) from public.bookings where customer_id = v_uid and business_id = p_business
      and status = 'booked' and starts_at > now()) >= 3
     or (select count(*) from public.bookings where customer_id = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too_many' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.booking_slots(p_business, p_service, (p_starts_at at time zone 'Asia/Jerusalem')::date) s
                 where s = p_starts_at) then
    raise exception 'not_available' using errcode = 'P0001';
  end if;

  select * into v_service from public.booking_services where id = p_service;

  if p_pet is not null then
    select * into v_pet from public.pets where id = p_pet and owner_id = v_uid;
    if v_pet.id is null then raise exception 'pet not found' using errcode = 'P0002'; end if;
    if p_share_pet then
      insert into public.pet_shares (pet_id, business_id) values (v_pet.id, p_business)
      on conflict do nothing;
    end if;
  end if;

  begin
    insert into public.bookings (business_id, customer_id, service_id, service_name, duration_min, starts_at, ends_at,
      pet_id, pet_name, pet_species, note, policy_accepted_at)
    values (p_business, v_uid, v_service.id, v_service.name, v_service.duration_min, p_starts_at,
      p_starts_at + make_interval(mins => v_service.duration_min), v_pet.id, v_pet.name, v_pet.species::text,
      nullif(trim(left(p_note, 300)), ''), case when p_policy_ok then now() end)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'slot_taken' using errcode = 'P0001';
  end;
  return v_id;
end;
$$;
revoke execute on function public.book_appointment(uuid, uuid, timestamptz, uuid, boolean, text, boolean) from public;
grant execute on function public.book_appointment(uuid, uuid, timestamptz, uuid, boolean, text, boolean) to authenticated;

-- סוף חלק 5

-- ביטול: הלקוח (תור עתידי) או העסק
create or replace function public.cancel_booking(p_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.bookings;
begin
  select * into v from public.bookings where id = p_id for update;
  if v.id is null or v.status <> 'booked' then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  if v.customer_id = auth.uid() then
    if v.starts_at <= now() then
      raise exception 'past' using errcode = 'P0001';
    end if;
    update public.bookings
    set status = 'cancelled_by_customer', cancelled_at = now(), cancel_reason = nullif(trim(left(p_reason, 200)), '')
    where id = p_id;
  elsif public.owns_business(v.business_id) then
    update public.bookings
    set status = 'cancelled_by_business', cancelled_at = now(), cancel_reason = nullif(trim(left(p_reason, 200)), '')
    where id = p_id;
  else
    raise exception 'not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke execute on function public.cancel_booking(uuid, text) from public;
grant execute on function public.cancel_booking(uuid, text) to authenticated;

-- הזזה (העסק בלבד, לכל שעה עתידית שלא חופפת לתור אחר)
create or replace function public.move_booking(p_id uuid, p_starts_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.bookings;
begin
  select * into v from public.bookings where id = p_id for update;
  if v.id is null or v.status <> 'booked' or not public.owns_business(v.business_id) then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  if p_starts_at <= now() then
    raise exception 'past' using errcode = 'P0001';
  end if;
  begin
    update public.bookings
    set starts_at = p_starts_at, ends_at = p_starts_at + make_interval(mins => v.duration_min)
    where id = p_id;
  exception when exclusion_violation then
    raise exception 'slot_taken' using errcode = 'P0001';
  end;
end;
$$;
revoke execute on function public.move_booking(uuid, timestamptz) from public;
grant execute on function public.move_booking(uuid, timestamptz) to authenticated;

-- סוף חלק 6

-- ─────────────────────────────────────────────────────────────
-- מה העסק רואה: התורים + הלקוח (שם וטלפון) + החיה
-- ─────────────────────────────────────────────────────────────

create or replace function public.business_bookings(p_from timestamptz, p_to timestamptz)
returns table (
  id             uuid,
  starts_at      timestamptz,
  ends_at        timestamptz,
  status         public.booking_status,
  service_name   text,
  note           text,
  cancel_reason  text,
  seen_at        timestamptz,
  created_at     timestamptz,
  customer_name  text,
  customer_phone text,
  pet_id         uuid,
  pet_name       text,
  pet_species    text,
  pet_breed      text,
  pet_sex        text,
  pet_birth_date date,
  pet_avatar     text,
  pet_shared     boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select k.id, k.starts_at, k.ends_at, k.status, k.service_name, k.note, k.cancel_reason, k.seen_at, k.created_at,
         pr.full_name, pr.phone,
         k.pet_id, coalesce(p.name, k.pet_name), coalesce(p.species::text, k.pet_species), p.breed, p.sex::text,
         p.birth_date, p.avatar_path,
         exists (select 1 from public.pet_shares s where s.pet_id = k.pet_id and s.business_id = k.business_id)
  from public.bookings k
  join public.businesses b on b.id = k.business_id and b.owner_id = auth.uid()
  join public.profiles pr on pr.id = k.customer_id
  left join public.pets p on p.id = k.pet_id
  where k.starts_at >= p_from and k.starts_at < p_to
  order by k.starts_at
$$;
revoke execute on function public.business_bookings(timestamptz, timestamptz) from public;
grant execute on function public.business_bookings(timestamptz, timestamptz) to authenticated;

-- סוף חלק 7

-- כמה תורים חדשים העסק עוד לא ראה (לתג בחשבון)
create or replace function public.business_new_bookings()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.bookings k
  join public.businesses b on b.id = k.business_id and b.owner_id = auth.uid()
  where k.seen_at is null and k.status = 'booked' and k.starts_at > now()
$$;
revoke execute on function public.business_new_bookings() from public;
grant execute on function public.business_new_bookings() to authenticated;

create or replace function public.mark_bookings_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.bookings k set seen_at = now()
  from public.businesses b
  where b.id = k.business_id and b.owner_id = auth.uid() and k.seen_at is null
$$;
revoke execute on function public.mark_bookings_seen() from public;
grant execute on function public.mark_bookings_seen() to authenticated;

-- סוף חלק 8
