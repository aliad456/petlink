-- Kami — מנה 2: גלריית ימי אימוץ
--
-- מיקום מודעות חדש, "גלריה": ערימת פוסטרים של עמותות בעמוד הקטגוריה שמסומנת
-- כקטגוריית האימוץ (ברירת מחדל: "ימי אימוץ"). בלי הגבלה מעשית של כמות ובלי
-- מידות קבועות — כל פוסטר מוצג בפרופורציות שלו. הבעלים מעלה אותם מהפאנל
-- (מודעות ← מודעה חדשה ← "עמוד ימי אימוץ").

-- ─────────────────────────────────────────────────────────────
-- מיקום מסוג גלריה
-- ─────────────────────────────────────────────────────────────

alter table public.ad_placements drop constraint ad_placements_kind_check;
alter table public.ad_placements add constraint ad_placements_kind_check check (kind in ('banner', 'popup', 'gallery'));
alter table public.ad_placements drop constraint ad_placements_capacity_check;
alter table public.ad_placements add constraint ad_placements_capacity_check check (capacity between 1 and 200);

insert into public.ad_placements (key, label, kind, capacity, image_width, image_height, mobile_width, mobile_height, sort_order)
values ('adoption', 'עמוד ימי אימוץ — ערימת פוסטרים', 'gallery', 100, 1080, 1350, null, null, 5)
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────
-- קטגוריית האימוץ (איפה מוצגת הגלריה)
-- ─────────────────────────────────────────────────────────────

alter table public.categories add column is_adoption boolean not null default false;
create unique index categories_one_adoption on public.categories (is_adoption) where is_adoption;
update public.categories set is_adoption = true where slug = 'adoption';

create function public.admin_set_category_adoption(p_id uuid, p_value boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('catalog.manage');
  if p_value then
    update public.categories set is_adoption = false where is_adoption and id <> p_id;
  end if;
  update public.categories set is_adoption = p_value where id = p_id;
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  perform public.log_admin_action('category.adoption', 'category', p_id::text, jsonb_build_object('value', p_value));
end;
$$;

revoke execute on function public.admin_set_category_adoption(uuid, boolean) from public, anon;
grant execute on function public.admin_set_category_adoption(uuid, boolean) to authenticated;
