-- Kami — מודעות: מידות שהבעלים קובע, ותצוגה מקדימה למפרסם
--
-- * לכל מיקום אפשר לקבוע רוחב וגובה (ותמונה נפרדת לטלפון, לא חובה).
--   ברירת המחדל לבאנרים משתנה לפס נמוך: 1200×300, בלי תמונת טלפון.
-- * לכל מודעה יש קישור סודי לתצוגה מקדימה (preview_token) שאפשר לשלוח למפרסם.

-- ─────────────────────────────────────────────────────────────
-- מידות
-- ─────────────────────────────────────────────────────────────

-- רק אם עוד לא שינו את ברירת המחדל הקודמת
update public.ad_placements
set image_width = 1200, image_height = 300, mobile_width = null, mobile_height = null
where kind = 'banner' and image_width = 1200 and image_height = 480;

alter table public.ad_placements
  add constraint ad_placements_size check (
    image_width between 100 and 4000 and image_height between 100 and 4000
    and (mobile_width is null) = (mobile_height is null)
    and (mobile_width is null or (mobile_width between 100 and 4000 and mobile_height between 100 and 4000))
  );

drop function public.admin_update_placement(text, int, boolean);

create function public.admin_update_placement(
  p_key           text,
  p_capacity      int,
  p_active        boolean,
  p_width         int,
  p_height        int,
  p_mobile_width  int,
  p_mobile_height int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('banners.manage');
  update public.ad_placements
  set capacity = p_capacity, is_active = p_active,
      image_width = p_width, image_height = p_height,
      mobile_width = p_mobile_width, mobile_height = p_mobile_height
  where key = p_key;
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  perform public.log_admin_action('ads.placement', 'placement', p_key,
    jsonb_build_object('capacity', p_capacity, 'active', p_active, 'size', p_width || 'x' || p_height,
                       'mobile', case when p_mobile_width is null then null else p_mobile_width || 'x' || p_mobile_height end));
end;
$$;

revoke execute on function public.admin_update_placement(text, int, boolean, int, int, int, int) from public, anon;
grant execute on function public.admin_update_placement(text, int, boolean, int, int, int, int) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- הצגה באתר: גם המידות של המיקום (כדי לשמור על הפרופורציות)
-- ─────────────────────────────────────────────────────────────

drop function public.active_ads(text);

create function public.active_ads(p_placement text)
returns table (
  id                uuid,
  kind              text,
  advertiser        text,
  alt_text          text,
  image_path        text,
  mobile_image_path text,
  has_link          boolean,
  width             int,
  height            int,
  mobile_width      int,
  mobile_height     int
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.kind, c.advertiser, c.alt_text, c.image_path, c.mobile_image_path, c.link_url is not null,
         p.image_width, p.image_height, p.mobile_width, p.mobile_height
  from public.ad_campaigns c
  join public.ad_campaign_days d on d.campaign_id = c.id and d.day = public.israel_today()
  join public.ad_placements p on p.key = c.placement and p.is_active
  where c.placement = p_placement and c.status = 'active'
  order by c.created_at
$$;

revoke execute on function public.active_ads(text) from public;
grant execute on function public.active_ads(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- תצוגה מקדימה למפרסם
-- ─────────────────────────────────────────────────────────────

alter table public.ad_campaigns
  add column preview_token uuid not null default gen_random_uuid() unique;

-- מי שיש לו את הקישור רואה איך המודעה תיראה. בלי פרטי קשר ובלי מחיר.
create function public.ad_preview(p_token uuid)
returns table (
  id                uuid,
  kind              text,
  placement         text,
  advertiser        text,
  alt_text          text,
  image_path        text,
  mobile_image_path text,
  width             int,
  height            int,
  mobile_width      int,
  mobile_height     int,
  first_day         date,
  last_day          date,
  day_count         int
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.kind, c.placement, c.advertiser, c.alt_text, c.image_path, c.mobile_image_path,
         p.image_width, p.image_height, p.mobile_width, p.mobile_height,
         (select min(day) from public.ad_campaign_days where campaign_id = c.id),
         (select max(day) from public.ad_campaign_days where campaign_id = c.id),
         (select count(*)::int from public.ad_campaign_days where campaign_id = c.id)
  from public.ad_campaigns c
  join public.ad_placements p on p.key = c.placement
  where c.preview_token = p_token
$$;

revoke execute on function public.ad_preview(uuid) from public;
grant execute on function public.ad_preview(uuid) to anon, authenticated;
