-- Kami — גלריה: סרטונים ונעיצה
--
-- 1. סרטונים בגלריה: אותה טבלה (business_photos) עם kind = 'video', ותמונת תצוגה (poster_path)
--    שהדפדפן חותך מהסרטון לפני ההעלאה. עד 3 סרטונים לעסק, והם נספרים במגבלת הגלריה.
-- 2. נעיצה: פריט אחד לכל עסק (pinned) שמופיע תמיד ראשון, כמו "נעוץ" באינסטגרם ובטיקטוק.

alter table public.business_photos
  add column if not exists kind text not null default 'image',
  add column if not exists poster_path text,
  add column if not exists pinned boolean not null default false;

alter table public.business_photos drop constraint if exists business_photos_kind_check;
alter table public.business_photos add constraint business_photos_kind_check
  check (kind in ('image', 'video') and (kind = 'video' or poster_path is null));

-- פריט נעוץ אחד לכל היותר לכל עסק.
create unique index if not exists business_photos_one_pinned
  on public.business_photos (business_id) where pinned;

-- מגבלות: 12 פריטים בחינמי (PRO בלי הגבלה, כמו קודם), ועד 3 סרטונים לכל עסק.
create or replace function public.check_photo_content()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if cardinality(public.find_profanity(new.caption)) > 0 then
    raise exception 'profanity' using errcode = 'P0001', hint = 'profanity';
  end if;
  if tg_op = 'INSERT' and (
    select count(*) from public.business_photos where business_id = new.business_id
  ) >= 12 and (select plan from public.businesses where id = new.business_id) <> 'pro' then
    raise exception 'gallery limit' using errcode = '22023', hint = 'gallery_limit';
  end if;
  if tg_op = 'INSERT' and new.kind = 'video' and (
    select count(*) from public.business_photos where business_id = new.business_id and kind = 'video'
  ) >= 3 then
    raise exception 'video limit' using errcode = '22023', hint = 'video_limit';
  end if;
  return new;
end;
$$;

-- נעיצה / ביטול נעיצה בפעולה אחת. רץ בהרשאות המשתמש, כך שה-RLS של הטבלה
-- (רק בעל העסק כותב) חל גם כאן. p_photo = null מבטל את הנעיצה.
create or replace function public.set_business_photo_pin(p_business uuid, p_photo uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.business_photos set pinned = false
  where business_id = p_business and pinned and id is distinct from p_photo;
  if p_photo is not null then
    update public.business_photos set pinned = true
    where id = p_photo and business_id = p_business;
    if not found then
      raise exception 'photo not found' using errcode = '42501';
    end if;
  end if;
end;
$$;

revoke execute on function public.set_business_photo_pin(uuid, uuid) from public, anon;
grant execute on function public.set_business_photo_pin(uuid, uuid) to authenticated;

-- אחסון: סרטונים עד 50MB (התמונות עדיין מוקטנות בדפדפן לפני ההעלאה).
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
where id = 'business-media';
