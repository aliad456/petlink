-- PetLink — ניהול קטגוריות ופילטרים מהפאנל
--
-- כל שינוי עובר דרך פונקציה שבודקת catalog.manage ורושמת ביומן באותה טרנזקציה.
-- לפי האפיון: הוספה, עריכה, הסתרה ושינוי סדר. אין מחיקה — מסתירים.
-- פילטרים מסוג open_now / distance מחושבים בקוד, ולכן אי אפשר ליצור עוד כאלה
-- ואי אפשר לשנות את הסוג או המפתח של פילטר קיים.

-- ─────────────────────────────────────────────────────────────
-- קטגוריות
-- ─────────────────────────────────────────────────────────────

create function public.admin_save_category(
  p_id          uuid,   -- null = קטגוריה חדשה
  p_slug        text,
  p_name        text,
  p_description text,
  p_icon        text,
  p_is_visible  boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id   uuid;
  v_slug text := lower(trim(p_slug));
  v_name text := trim(p_name);
begin
  perform public.assert_permission('catalog.manage');

  if v_name = '' or char_length(v_name) > 60 then
    raise exception 'invalid name' using errcode = '22023';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 40 then
    raise exception 'invalid slug' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.categories (slug, name, description, icon, is_visible, sort_order)
    values (
      v_slug, v_name, nullif(trim(p_description), ''), p_icon, coalesce(p_is_visible, true),
      coalesce((select max(sort_order) from public.categories), 0) + 10
    )
    returning id into v_id;
    perform public.log_admin_action('category.create', 'category', v_id::text,
      jsonb_build_object('name', v_name, 'slug', v_slug));
  else
    update public.categories
    set slug = v_slug, name = v_name, description = nullif(trim(p_description), ''),
        icon = p_icon, is_visible = coalesce(p_is_visible, is_visible)
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'category not found' using errcode = 'P0002';
    end if;
    perform public.log_admin_action('category.update', 'category', v_id::text,
      jsonb_build_object('name', v_name, 'slug', v_slug));
  end if;

  return v_id;
end;
$$;

create function public.admin_set_category_visible(p_id uuid, p_visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('catalog.manage');
  update public.categories set is_visible = p_visible where id = p_id;
  if not found then
    raise exception 'category not found' using errcode = 'P0002';
  end if;
  perform public.log_admin_action(
    case when p_visible then 'category.show' else 'category.hide' end,
    'category', p_id::text);
end;
$$;

-- סדר חדש: המערך מכיל את כל המזהים בסדר הרצוי.
create function public.admin_reorder_categories(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('catalog.manage');
  if (select count(*) from public.categories) <> coalesce(array_length(p_ids, 1), 0)
     or exists (select 1 from public.categories c where c.id <> all (p_ids)) then
    raise exception 'ids must list every category exactly once' using errcode = '22023';
  end if;

  update public.categories c
  set sort_order = o.ord * 10
  from unnest(p_ids) with ordinality as o(id, ord)
  where c.id = o.id;

  perform public.log_admin_action('category.reorder', 'category', null,
    jsonb_build_object('order', to_jsonb(p_ids)));
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- פילטרים
-- ─────────────────────────────────────────────────────────────

create function public.admin_save_filter(
  p_id           uuid,   -- null = פילטר חדש
  p_name         text,
  p_kind         public.filter_kind,  -- נקרא רק ביצירה
  p_options      jsonb,
  p_is_featured  boolean,
  p_is_visible   boolean,
  p_category_ids uuid[]  -- ריק = מוצג בכל הקטגוריות
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id   uuid;
  v_kind public.filter_kind;
  v_name text := trim(p_name);
  v_opts jsonb := coalesce(p_options, '[]'::jsonb);
begin
  perform public.assert_permission('catalog.manage');

  if v_name = '' or char_length(v_name) > 60 then
    raise exception 'invalid name' using errcode = '22023';
  end if;

  if p_id is null then
    if p_kind not in ('boolean', 'multi_select') then
      raise exception 'only boolean and multi_select filters can be created' using errcode = '22023';
    end if;
    v_kind := p_kind;
  else
    select kind into v_kind from public.filters where id = p_id;
    if v_kind is null then
      raise exception 'filter not found' using errcode = 'P0002';
    end if;
  end if;

  -- אפשרויות: רק לפילטר בחירה מרובה, [{value, label}] עם ערכים ייחודיים.
  if v_kind = 'multi_select' then
    if jsonb_typeof(v_opts) <> 'array' or jsonb_array_length(v_opts) = 0
       or exists (
         select 1 from jsonb_array_elements(v_opts) o
         where jsonb_typeof(o) <> 'object'
            or coalesce(trim(o ->> 'label'), '') = ''
            or coalesce(o ->> 'value', '') !~ '^[a-z0-9_]+$'
       )
       or (select count(distinct o ->> 'value') from jsonb_array_elements(v_opts) o)
          <> jsonb_array_length(v_opts)
    then
      raise exception 'invalid options' using errcode = '22023';
    end if;
  else
    v_opts := '[]'::jsonb;
  end if;

  if p_id is null then
    insert into public.filters (key, name, kind, options, is_featured, is_visible, sort_order)
    values (
      -- מפתח פנימי. לא מוצג למשתמש ולא משתנה אחרי היצירה.
      'f_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
      v_name, v_kind, v_opts, coalesce(p_is_featured, false), coalesce(p_is_visible, true),
      coalesce((select max(sort_order) from public.filters), 0) + 10
    )
    returning id into v_id;
  else
    update public.filters
    set name = v_name, options = v_opts,
        is_featured = coalesce(p_is_featured, is_featured),
        is_visible = coalesce(p_is_visible, is_visible)
    where id = p_id
    returning id into v_id;
  end if;

  delete from public.category_filters where filter_id = v_id;
  insert into public.category_filters (category_id, filter_id)
  select distinct c, v_id from unnest(coalesce(p_category_ids, '{}')) as c
  where exists (select 1 from public.categories where id = c);

  perform public.log_admin_action(
    case when p_id is null then 'filter.create' else 'filter.update' end,
    'filter', v_id::text,
    jsonb_build_object('name', v_name, 'kind', v_kind));
  return v_id;
end;
$$;

create function public.admin_set_filter_visible(p_id uuid, p_visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('catalog.manage');
  update public.filters set is_visible = p_visible where id = p_id;
  if not found then
    raise exception 'filter not found' using errcode = 'P0002';
  end if;
  perform public.log_admin_action(
    case when p_visible then 'filter.show' else 'filter.hide' end,
    'filter', p_id::text);
end;
$$;

create function public.admin_reorder_filters(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('catalog.manage');
  if (select count(*) from public.filters) <> coalesce(array_length(p_ids, 1), 0)
     or exists (select 1 from public.filters f where f.id <> all (p_ids)) then
    raise exception 'ids must list every filter exactly once' using errcode = '22023';
  end if;

  update public.filters f
  set sort_order = o.ord * 10
  from unnest(p_ids) with ordinality as o(id, ord)
  where f.id = o.id;

  perform public.log_admin_action('filter.reorder', 'filter', null,
    jsonb_build_object('order', to_jsonb(p_ids)));
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
    'public.admin_save_category(uuid, text, text, text, text, boolean)',
    'public.admin_set_category_visible(uuid, boolean)',
    'public.admin_reorder_categories(uuid[])',
    'public.admin_save_filter(uuid, text, public.filter_kind, jsonb, boolean, boolean, uuid[])',
    'public.admin_set_filter_visible(uuid, boolean)',
    'public.admin_reorder_filters(uuid[])'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end;
$$;
