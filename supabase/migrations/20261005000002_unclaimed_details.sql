-- Kami — עמודים לא מנוהלים: שעות פעילות, פילטרים וייבוא מטבלה
--
-- admin_set_unclaimed_details: שעות + "פתוח בחגים" + ערכי פילטרים (מגיע לבית, סוגי חיות…)
--   לעמוד שהצוות יצר ועוד לא נתבע.
-- admin_import_unclaimed_businesses: יצירת הרבה עמודים בבת אחת (מטבלת אקסל / CSV),
--   בטרנזקציה אחת — או שכולם נוצרים או אף אחד.
-- שתיהן דורשות businesses.edit ונרשמות ביומן הפעולות.

create function public.admin_set_unclaimed_details(
  p_business         uuid,
  p_hours            jsonb,
  p_open_on_holidays boolean,
  p_filters          jsonb  -- [{"filter_id": uuid, "bool_value": bool, "option_values": [text]}]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category uuid;
begin
  perform public.assert_permission('businesses.edit');

  update public.businesses
  set hours = coalesce(p_hours, hours),
      open_on_holidays = coalesce(p_open_on_holidays, open_on_holidays)
  where id = p_business and owner_id is null
  returning category_id into v_category;
  if v_category is null then
    raise exception 'business not found or already claimed' using errcode = 'P0002';
  end if;

  if p_filters is not null then
    if jsonb_typeof(p_filters) <> 'array' then
      raise exception 'invalid filters' using errcode = '22023';
    end if;
    delete from public.business_filter_values where business_id = p_business;
    insert into public.business_filter_values (business_id, filter_id, bool_value, option_values)
    select p_business, f.id,
           case when f.kind = 'boolean' then (v ->> 'bool_value')::boolean end,
           case when f.kind = 'multi_select' then
             array(select o from jsonb_array_elements_text(coalesce(v -> 'option_values', '[]')) o
                   where f.options @> jsonb_build_array(jsonb_build_object('value', o)))
           else '{}' end
    from jsonb_array_elements(p_filters) v
    join public.filters f on f.id = (v ->> 'filter_id')::uuid and f.kind in ('boolean', 'multi_select')
    -- רק פילטרים ששייכים לתחום של העסק (פילטר בלי תחומים = לכולם)
    where not exists (select 1 from public.category_filters cf where cf.filter_id = f.id)
       or exists (select 1 from public.category_filters cf where cf.filter_id = f.id and cf.category_id = v_category);
    -- שורות ריקות לא נשמרות
    delete from public.business_filter_values
    where business_id = p_business and bool_value is not true and cardinality(option_values) = 0;
  end if;

  perform public.log_admin_action('business.update_unclaimed_details', 'business', p_business::text,
    jsonb_build_object('hours', p_hours is not null, 'filters', coalesce(jsonb_array_length(p_filters), 0)));
end;
$$;

-- כל שורה: {"name","category_id","city","address","phone","whatsapp","website","bio",
--            "hours", "open_on_holidays", "filters"}
create function public.admin_import_unclaimed_businesses(p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  v_id uuid;
  v_count int := 0;
begin
  perform public.assert_permission('businesses.edit');
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 200 then
    raise exception 'invalid rows' using errcode = '22023';
  end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    v_id := public.admin_save_unclaimed_business(
      null, r ->> 'name', (r ->> 'category_id')::uuid, r ->> 'city', r ->> 'address',
      r ->> 'phone', r ->> 'whatsapp', r ->> 'website', r ->> 'bio', null
    );
    perform public.admin_set_unclaimed_details(
      v_id, r -> 'hours', coalesce((r ->> 'open_on_holidays')::boolean, false), coalesce(r -> 'filters', '[]')
    );
    v_count := v_count + 1;
  end loop;

  perform public.log_admin_action('business.import_unclaimed', 'business', null,
    jsonb_build_object('count', v_count));
  return v_count;
end;
$$;

revoke execute on function public.admin_set_unclaimed_details(uuid, jsonb, boolean, jsonb) from public, anon;
revoke execute on function public.admin_import_unclaimed_businesses(jsonb) from public, anon;
grant execute on function public.admin_set_unclaimed_details(uuid, jsonb, boolean, jsonb) to authenticated;
grant execute on function public.admin_import_unclaimed_businesses(jsonb) to authenticated;
