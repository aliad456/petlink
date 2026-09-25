-- Kami — "חיית המחמד שלי"
--
-- בעלי חיות (חשבון pet_owner) יוצרים פרופיל לכל חיה: פרטים, תמונות, חיסונים,
-- ומאיפה אומצה. הפרופיל פרטי. אפשר לשתף אותו:
--   * עם עסק ב-Kami (pet_shares) — העסק רואה את החיה ואת שם וטלפון הבעלים
--     בלוח שלו, עד שאחד מהם מבטל;
--   * בקישור סודי (share_token) — לכל אחד שמקבל את הקישור, כל עוד הקישור פעיל.
-- עמותה ב-Kami שממנה אומצה חיה מקבלת מונה ציבורי "X חיות אומצו מכאן".

-- ─────────────────────────────────────────────────────────────
-- טבלאות
-- ─────────────────────────────────────────────────────────────

create table public.pets (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references public.profiles (id) on delete cascade,
  name                  text not null check (char_length(name) between 1 and 40),
  species               text not null check (species in ('dog', 'cat', 'bird', 'rabbit', 'rodent', 'fish', 'reptile', 'other')),
  breed                 text check (char_length(breed) <= 60),
  sex                   text not null default 'unknown' check (sex in ('male', 'female', 'unknown')),
  birth_date            date check (birth_date > date '1980-01-01'),
  birth_date_estimated  boolean not null default false,
  weight_kg             numeric(5, 2) check (weight_kg > 0 and weight_kg < 200),
  neutered              boolean,
  microchip             text check (char_length(microchip) <= 20),
  medical_notes         text check (char_length(medical_notes) <= 1000),  -- אלרגיות, מחלות, תרופות
  notes                 text check (char_length(notes) <= 1000),          -- אופי, העדפות, תספורת
  adopted               boolean not null default false,
  adopted_from_business uuid references public.businesses (id) on delete set null,
  adopted_from_text     text check (char_length(adopted_from_text) <= 80),
  adopted_on            date,
  avatar_path           text,
  share_token           uuid not null default gen_random_uuid() unique,
  share_link_enabled    boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index pets_owner_idx on public.pets (owner_id);
create index pets_adopted_from_idx on public.pets (adopted_from_business) where adopted_from_business is not null;

create table public.pet_photos (
  id         uuid primary key default gen_random_uuid(),
  pet_id     uuid not null references public.pets (id) on delete cascade,
  path       text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index pet_photos_pet_idx on public.pet_photos (pet_id, sort_order);

create table public.pet_vaccines (
  id         uuid primary key default gen_random_uuid(),
  pet_id     uuid not null references public.pets (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  given_on   date,
  next_due   date,
  notes      text check (char_length(notes) <= 200),
  created_at timestamptz not null default now()
);
create index pet_vaccines_pet_idx on public.pet_vaccines (pet_id, given_on desc);

create table public.pet_shares (
  pet_id      uuid not null references public.pets (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (pet_id, business_id)
);
create index pet_shares_business_idx on public.pet_shares (business_id, created_at desc);

create trigger pets_updated_at before update on public.pets
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- כללים: מגבלות, מילים גסות, שדות שהמשתמש לא משנה
-- ─────────────────────────────────────────────────────────────

create function public.check_pet()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if cardinality(public.find_profanity(concat_ws(' ', new.name, new.breed, new.medical_notes, new.notes, new.adopted_from_text))) > 0 then
    raise exception 'profanity' using errcode = 'P0001', hint = 'profanity';
  end if;
  if tg_op = 'INSERT' then
    if (select count(*) from public.pets where owner_id = new.owner_id) >= 10 then
      raise exception 'too many pets' using errcode = '22023', hint = 'pet_limit';
    end if;
  elsif current_user in ('authenticated', 'anon') and (
    new.owner_id <> old.owner_id or new.share_token <> old.share_token or new.created_at <> old.created_at
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not new.adopted then
    new.adopted_from_business := null;
    new.adopted_from_text := null;
    new.adopted_on := null;
  end if;
  return new;
end;
$$;

create trigger pets_check before insert or update on public.pets
  for each row execute function public.check_pet();

create function public.check_pet_photo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.pet_photos where pet_id = new.pet_id) >= 12 then
    raise exception 'too many photos' using errcode = '22023', hint = 'photo_limit';
  end if;
  return new;
end;
$$;

create trigger pet_photos_check before insert on public.pet_photos
  for each row execute function public.check_pet_photo();

create function public.check_pet_vaccine()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if cardinality(public.find_profanity(concat_ws(' ', new.name, new.notes))) > 0 then
    raise exception 'profanity' using errcode = 'P0001', hint = 'profanity';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.pet_vaccines where pet_id = new.pet_id) >= 60 then
    raise exception 'too many vaccines' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger pet_vaccines_check before insert or update on public.pet_vaccines
  for each row execute function public.check_pet_vaccine();

-- ─────────────────────────────────────────────────────────────
-- הרשאות (RLS)
-- ─────────────────────────────────────────────────────────────

-- האם החיה שלי
create function public.owns_pet(p_pet uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.pets where id = p_pet and owner_id = auth.uid())
$$;

-- האם החיה שותפה עם עסק שלי
create function public.pet_shared_with_me(p_pet uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pet_shares s
    join public.businesses b on b.id = s.business_id
    where s.pet_id = p_pet and b.owner_id = auth.uid() and b.status = 'approved'
  )
$$;

alter table public.pets         enable row level security;
alter table public.pet_photos   enable row level security;
alter table public.pet_vaccines enable row level security;
alter table public.pet_shares   enable row level security;

create policy pets_select on public.pets for select to authenticated
  using (owner_id = auth.uid() or public.pet_shared_with_me(id));
create policy pets_insert on public.pets for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and account_type = 'pet_owner' and status = 'active' and deleted_at is null
    )
  );
create policy pets_update on public.pets for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy pets_delete on public.pets for delete to authenticated using (owner_id = auth.uid());

create policy pet_photos_select on public.pet_photos for select to authenticated
  using (public.owns_pet(pet_id) or public.pet_shared_with_me(pet_id));
create policy pet_photos_write on public.pet_photos for all to authenticated
  using (public.owns_pet(pet_id)) with check (public.owns_pet(pet_id));

create policy pet_vaccines_select on public.pet_vaccines for select to authenticated
  using (public.owns_pet(pet_id) or public.pet_shared_with_me(pet_id));
create policy pet_vaccines_write on public.pet_vaccines for all to authenticated
  using (public.owns_pet(pet_id)) with check (public.owns_pet(pet_id));

-- שיתוף: הבעלים מוסיף ומבטל; העסק רואה ויכול להסיר מהלוח שלו.
create policy pet_shares_select on public.pet_shares for select to authenticated
  using (public.owns_pet(pet_id) or public.owns_business(business_id));
create policy pet_shares_insert on public.pet_shares for insert to authenticated
  with check (
    public.owns_pet(pet_id)
    and exists (
      select 1 from public.businesses
      where id = business_id and status = 'approved' and owner_id is not null and owner_id <> auth.uid()
    )
  );
create policy pet_shares_delete on public.pet_shares for delete to authenticated
  using (public.owns_pet(pet_id) or public.owns_business(business_id));

revoke update on public.pet_shares from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- מה העסק רואה: החיות ששותפו איתו + שם וטלפון הבעלים
-- ─────────────────────────────────────────────────────────────

create function public.business_shared_pets()
returns table (
  pet_id      uuid,
  name        text,
  species     text,
  breed       text,
  avatar_path text,
  owner_name  text,
  owner_phone text,
  shared_at   timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.species, p.breed, p.avatar_path, pr.full_name, pr.phone, s.created_at
  from public.pet_shares s
  join public.businesses b on b.id = s.business_id and b.owner_id = auth.uid()
  join public.pets p on p.id = s.pet_id
  join public.profiles pr on pr.id = p.owner_id
  order by s.created_at desc
$$;

-- שם וטלפון הבעלים, לעסק שהחיה שותפה איתו
create function public.pet_owner_contact(p_pet uuid)
returns table (full_name text, phone text, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.full_name, pr.phone, pr.email
  from public.pets p
  join public.profiles pr on pr.id = p.owner_id
  where p.id = p_pet and public.pet_shared_with_me(p_pet)
$$;

-- ─────────────────────────────────────────────────────────────
-- קישור שיתוף (בלי התחברות)
-- ─────────────────────────────────────────────────────────────

create function public.pet_by_share_token(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'pet', to_jsonb(p) - 'owner_id' - 'share_token' - 'share_link_enabled',
    'owner_first_name', split_part(pr.full_name, ' ', 1),
    'adopted_from_name', b.name,
    'photos', coalesce((select jsonb_agg(ph.path order by ph.sort_order, ph.created_at) from public.pet_photos ph where ph.pet_id = p.id), '[]'),
    'vaccines', coalesce((select jsonb_agg(jsonb_build_object('name', v.name, 'given_on', v.given_on, 'next_due', v.next_due, 'notes', v.notes) order by v.given_on desc nulls last) from public.pet_vaccines v where v.pet_id = p.id), '[]')
  )
  from public.pets p
  join public.profiles pr on pr.id = p.owner_id
  left join public.businesses b on b.id = p.adopted_from_business
  where p.share_token = p_token and p.share_link_enabled
$$;

-- יצירת קישור חדש (מבטל את הקודם)
create function public.rotate_pet_share_token(p_pet uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v uuid := gen_random_uuid();
begin
  update public.pets set share_token = v where id = p_pet and owner_id = auth.uid();
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  return v;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- עמותות: כמה חיות אומצו מהן (מספר בלבד, ציבורי)
-- ─────────────────────────────────────────────────────────────

create function public.adopted_count(p_business uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.pets where adopted_from_business = p_business
$$;

-- ─────────────────────────────────────────────────────────────
-- תמונות: pet-media/<user_id>/<pet_id>/<file>
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-media', 'pet-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "pet media: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pet-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pet media: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'pet-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pet media: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pet-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────
-- הרשאות הרצה
-- ─────────────────────────────────────────────────────────────

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.owns_pet(uuid)',
    'public.pet_shared_with_me(uuid)',
    'public.business_shared_pets()',
    'public.pet_owner_contact(uuid)',
    'public.rotate_pet_share_token(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end;
$$;

revoke execute on function public.pet_by_share_token(uuid) from public;
grant execute on function public.pet_by_share_token(uuid) to anon, authenticated;
revoke execute on function public.adopted_count(uuid) from public;
grant execute on function public.adopted_count(uuid) to anon, authenticated;
