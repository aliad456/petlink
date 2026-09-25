-- Kami — מנה 1: וטרינר חירום, מבצעים, מועדפים
--
-- * קטגוריית חירום: קטגוריה אחת (למשל וטרינרים) מסומנת בפאנל, ובדף הבית מופיע
--   כפתור "חירום? פתוחים עכשיו, הכי קרוב אליך".
-- * מבצע: לכל עסק מבצע אחד עם תאריך סיום. מבצעים פעילים מופיעים ב"מבצעים השבוע".
-- * מועדפים: משתמש שומר עסקים ברשימה אישית.

-- ─────────────────────────────────────────────────────────────
-- קטגוריית חירום
-- ─────────────────────────────────────────────────────────────

alter table public.categories add column is_emergency boolean not null default false;
create unique index categories_one_emergency on public.categories (is_emergency) where is_emergency;

create function public.admin_set_category_emergency(p_id uuid, p_value boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('catalog.manage');
  if p_value then
    update public.categories set is_emergency = false where is_emergency and id <> p_id;
  end if;
  update public.categories set is_emergency = p_value where id = p_id;
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  perform public.log_admin_action('category.emergency', 'category', p_id::text, jsonb_build_object('value', p_value));
end;
$$;

revoke execute on function public.admin_set_category_emergency(uuid, boolean) from public, anon;
grant execute on function public.admin_set_category_emergency(uuid, boolean) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- מבצעים
-- ─────────────────────────────────────────────────────────────

alter table public.businesses
  add column deal_text  text check (char_length(deal_text) <= 80),
  add column deal_until date;

create index businesses_deal_idx on public.businesses (deal_until) where deal_text is not null;

-- סינון מילים גסות גם במבצע
create or replace function public.check_business_content()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_found text[];
begin
  v_found := public.find_profanity(concat_ws(' ',
    new.name, new.tagline, new.bio, new.city, new.address, new.service_area, new.deal_text,
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

  -- מבצע חייב תאריך סיום, עד 60 יום קדימה
  if new.deal_text is not null and (
    new.deal_until is null or new.deal_until > (now() at time zone 'Asia/Jerusalem')::date + 60
  ) and (tg_op = 'INSERT' or new.deal_text is distinct from old.deal_text or new.deal_until is distinct from old.deal_until) then
    raise exception 'invalid deal' using errcode = '22023', hint = 'deal_until';
  end if;

  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- מועדפים
-- ─────────────────────────────────────────────────────────────

create table public.favorites (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, business_id)
);

create index favorites_business_idx on public.favorites (business_id);

alter table public.favorites enable row level security;

create policy favorites_select_own on public.favorites
  for select to authenticated using (user_id = auth.uid());
create policy favorites_insert_own on public.favorites
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_business_public(business_id));
create policy favorites_delete_own on public.favorites
  for delete to authenticated using (user_id = auth.uid());

revoke update on public.favorites from anon, authenticated;
