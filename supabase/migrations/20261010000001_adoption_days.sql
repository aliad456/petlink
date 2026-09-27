-- Kami — ימי אימוץ בעמוד העסק
--
-- עמותה יכולה להציג ימים ושעות של ימי אימוץ, בנפרד משעות הפעילות.
-- {"enabled": true, "days": {"5": [["10:00", "14:00"]]}, "note": "פארק הירקון, ליד הכניסה"}
-- null = לא הוגדר. בטוח להריץ שוב.

alter table public.businesses add column if not exists adoption_days jsonb;

alter table public.businesses drop constraint if exists businesses_adoption_days_shape;
alter table public.businesses add constraint businesses_adoption_days_shape check (
  adoption_days is null
  or (jsonb_typeof(adoption_days) = 'object'
      and jsonb_typeof(coalesce(adoption_days -> 'days', '{}'::jsonb)) = 'object'
      and char_length(coalesce(adoption_days ->> 'note', '')) <= 80)
);

-- סוף הקובץ
