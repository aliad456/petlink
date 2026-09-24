-- Kami — שלב 4: חיפוש
--
-- מרחק מחושב ממרכז העיר של העסק (טבלת cities). בהמשך אפשר למלא
-- lat/lng מדויקים מכתובת (location_source = 'address') בלי לשנות את החיפוש.

-- ─────────────────────────────────────────────────────────────
-- ערים
-- ─────────────────────────────────────────────────────────────

create table public.cities (
  name    text primary key,
  aliases text[] not null default '{}',
  lat     double precision not null,
  lng     double precision not null
);

alter table public.cities enable row level security;
create policy cities_select on public.cities for select to anon, authenticated using (true);

insert into public.cities (name, lat, lng, aliases) values
  ('אופקים', 31.31, 34.62, '{}'),
  ('אור יהודה', 32.03, 34.85, '{}'),
  ('אור עקיבא', 32.51, 34.92, '{}'),
  ('אילת', 29.56, 34.95, '{}'),
  ('אלעד', 32.05, 34.95, '{}'),
  ('אריאל', 32.10, 35.17, '{}'),
  ('אשדוד', 31.80, 34.65, '{}'),
  ('אשקלון', 31.67, 34.57, '{}'),
  ('באר יעקב', 31.94, 34.84, '{}'),
  ('באר שבע', 31.25, 34.79, '{"ב\"ש"}'),
  ('בית שאן', 32.50, 35.50, '{}'),
  ('בית שמש', 31.75, 34.99, '{}'),
  ('בני ברק', 32.08, 34.83, '{}'),
  ('בת ים', 32.02, 34.75, '{}'),
  ('גבעת שמואל', 32.08, 34.85, '{}'),
  ('גבעתיים', 32.07, 34.81, '{}'),
  ('דימונה', 31.07, 35.03, '{}'),
  ('הוד השרון', 32.15, 34.89, '{}'),
  ('הרצליה', 32.16, 34.84, '{}'),
  ('זכרון יעקב', 32.57, 34.95, '{}'),
  ('חדרה', 32.44, 34.92, '{}'),
  ('חולון', 32.02, 34.78, '{}'),
  ('חיפה', 32.79, 34.99, '{}'),
  ('טבריה', 32.79, 35.53, '{}'),
  ('טירת כרמל', 32.76, 34.97, '{}'),
  ('יבנה', 31.88, 34.74, '{}'),
  ('יהוד-מונוסון', 32.03, 34.89, '{"יהוד","יהוד מונוסון"}'),
  ('יקנעם', 32.66, 35.11, '{"יקנעם עילית"}'),
  ('ירושלים', 31.77, 35.21, '{"י-ם"}'),
  ('כפר יונה', 32.32, 34.94, '{}'),
  ('כפר סבא', 32.18, 34.91, '{}'),
  ('כרמיאל', 32.92, 35.30, '{}'),
  ('לוד', 31.95, 34.89, '{}'),
  ('מבשרת ציון', 31.80, 35.15, '{"מבשרת"}'),
  ('מגדל העמק', 32.68, 35.24, '{}'),
  ('מודיעין', 31.90, 35.01, '{"מודיעין מכבים רעות","מודיעין-מכבים-רעות"}'),
  ('מעלה אדומים', 31.78, 35.30, '{}'),
  ('מעלות-תרשיחא', 33.02, 35.27, '{"מעלות"}'),
  ('נהריה', 33.01, 35.10, '{}'),
  ('נס ציונה', 31.93, 34.80, '{}'),
  ('נוף הגליל', 32.71, 35.33, '{"נצרת עילית"}'),
  ('נצרת', 32.70, 35.30, '{}'),
  ('נתיבות', 31.42, 34.59, '{}'),
  ('נתניה', 32.33, 34.86, '{}'),
  ('עכו', 32.93, 35.08, '{}'),
  ('עפולה', 32.61, 35.29, '{}'),
  ('ערד', 31.26, 35.21, '{}'),
  ('פרדס חנה-כרכור', 32.47, 34.97, '{"פרדס חנה","כרכור"}'),
  ('פתח תקווה', 32.09, 34.89, '{"פתח תקוה","פ\"ת"}'),
  ('צפת', 32.96, 35.50, '{}'),
  ('קצרין', 32.99, 35.69, '{}'),
  ('קריית אונו', 32.06, 34.86, '{"קרית אונו"}'),
  ('קריית אתא', 32.81, 35.11, '{"קרית אתא"}'),
  ('קריית ביאליק', 32.83, 35.08, '{"קרית ביאליק"}'),
  ('קריית גת', 31.61, 34.76, '{"קרית גת"}'),
  ('קריית ים', 32.85, 35.07, '{"קרית ים"}'),
  ('קריית מוצקין', 32.84, 35.08, '{"קרית מוצקין"}'),
  ('קריית מלאכי', 31.73, 34.75, '{"קרית מלאכי"}'),
  ('קריית שמונה', 33.21, 35.57, '{"קרית שמונה"}'),
  ('ראש העין', 32.10, 34.95, '{}'),
  ('ראשון לציון', 31.96, 34.80, '{"ראשל\"צ","ראשון"}'),
  ('רחובות', 31.89, 34.81, '{}'),
  ('רמלה', 31.93, 34.87, '{}'),
  ('רמת גן', 32.07, 34.82, '{"ר\"ג"}'),
  ('רמת השרון', 32.15, 34.84, '{}'),
  ('רעננה', 32.18, 34.87, '{}'),
  ('שדרות', 31.52, 34.60, '{}'),
  ('שוהם', 32.00, 34.95, '{}'),
  ('תל אביב-יפו', 32.08, 34.78, '{"תל אביב","תל-אביב","ת\"א","יפו"}');

-- שם עיר (או כינוי) → השם הרשמי בטבלה.
create function public.resolve_city(p_name text)
returns text
language sql
stable
set search_path = ''
as $$
  select c.name from public.cities c
  where c.name = trim(p_name) or trim(p_name) = any (c.aliases)
  limit 1;
$$;

grant execute on function public.resolve_city(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- מיקום העסק
-- ─────────────────────────────────────────────────────────────

alter table public.businesses
  add column lat double precision,
  add column lng double precision,
  add column location_source text check (location_source in ('city', 'address'));

-- המיקום נגזר מהעיר בלבד (או ממיקום מדויק שהצוות הזין, location_source = 'address').
-- ערכי lat/lng שמשתמש שולח ישירות דרך ה-API נזרקים, כדי שאי אפשר "לקרב" עסק ללקוחות.
create function public.set_business_location()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_city public.cities;
  v_user boolean := current_user in ('authenticated', 'anon');
begin
  if v_user then
    if tg_op = 'INSERT' then
      new.lat := null; new.lng := null; new.location_source := null;
    else
      new.lat := old.lat; new.lng := old.lng; new.location_source := old.location_source;
    end if;
  end if;

  -- אין שינוי בעיר ויש כבר מיקום: משאירים.
  if tg_op = 'UPDATE' and new.city is not distinct from old.city and new.lat is not null then
    return new;
  end if;

  select * into v_city from public.cities c
  where c.name = trim(new.city) or trim(new.city) = any (c.aliases)
  limit 1;

  if v_city.name is not null then
    new.city := v_city.name;
    new.lat := v_city.lat;
    new.lng := v_city.lng;
    new.location_source := 'city';
  else
    new.lat := null;
    new.lng := null;
    new.location_source := null;
  end if;
  return new;
end;
$$;

create trigger businesses_set_location
  before insert or update on public.businesses
  for each row execute function public.set_business_location();

-- מילוי לעסקים קיימים (רץ כבעלים של הטבלה, לא כמשתמש)
update public.businesses set lat = null;

-- ─────────────────────────────────────────────────────────────
-- פתוח עכשיו + מרחק
-- ─────────────────────────────────────────────────────────────

-- hours: {"0": [["09:00","18:00"]], ...}, 0 = ראשון. לפי שעון ישראל.
create function public.is_open_at(p_hours jsonb, p_at timestamptz default now())
returns boolean
language sql
stable
set search_path = ''
as $$
  with t as (
    select extract(dow from p_at at time zone 'Asia/Jerusalem')::int as dow,
           (extract(hour from p_at at time zone 'Asia/Jerusalem') * 60
            + extract(minute from p_at at time zone 'Asia/Jerusalem'))::int as mins
  ),
  ranges as (
    -- היום
    select (split_part(r ->> 0, ':', 1)::int * 60 + split_part(r ->> 0, ':', 2)::int) as s,
           (split_part(r ->> 1, ':', 1)::int * 60 + split_part(r ->> 1, ':', 2)::int) as e,
           0 as shift
    from t, jsonb_array_elements(coalesce(p_hours -> (t.dow::text), '[]')) r
    union all
    -- אתמול, אם נסגר אחרי חצות
    select (split_part(r ->> 0, ':', 1)::int * 60 + split_part(r ->> 0, ':', 2)::int),
           (split_part(r ->> 1, ':', 1)::int * 60 + split_part(r ->> 1, ':', 2)::int),
           1
    from t, jsonb_array_elements(coalesce(p_hours -> (((t.dow + 6) % 7)::text), '[]')) r
  )
  select exists (
    select 1 from ranges, t
    where (shift = 0 and ((e > s and t.mins >= s and t.mins < e) or (e <= s and t.mins >= s)))
       or (shift = 1 and e <= s and t.mins < e)
  );
$$;

create function public.distance_km(lat1 double precision, lng1 double precision,
                                   lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

grant execute on function public.is_open_at(jsonb, timestamptz) to anon, authenticated;
grant execute on function public.distance_km(double precision, double precision, double precision, double precision) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- חיפוש
-- ─────────────────────────────────────────────────────────────

-- רץ עם הרשאות המשתמש (security invoker), כך ש-RLS מחזיר רק עסקים מאושרים.
-- p_bool_filters: מזהי פילטרים מסוג כן/לא שחייבים להיות מסומנים.
-- p_option_filters: {"<filter_id>": ["dog","cat"]} — מספיקה התאמה לאחת האפשרויות.
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
  total_count    bigint
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
         count(*) over ()
  from within w
  order by (w.plan = 'pro') desc, w.is_featured desc, w.dist asc nulls last, w.approved_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.search_businesses(text, uuid, double precision, double precision, double precision, boolean, uuid[], jsonb, int, int) to anon, authenticated;

create index businesses_approved_geo_idx on public.businesses (lat, lng) where status = 'approved';
