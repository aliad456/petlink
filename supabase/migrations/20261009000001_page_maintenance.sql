-- Kami — מצב תחזוקה לדפים
--
-- דף במצב תחזוקה מציג לגולשים "בקרוב חוזרים", ורק צוות עם ההרשאה
-- site.maintenance (והבעלים) רואה את הדף האמיתי. נשלט מהפאנל ← קטגוריות ← מצב תחזוקה.
-- path: "/plans", "/vets" (עמוד קטגוריה), "/b/*" (כל עמודי העסקים).
-- בטוח להריץ שוב.

insert into public.permissions (key, group_key, label, description, sort_order)
values ('site.maintenance', 'content', 'מצב תחזוקה לדפים', 'סגירת דף לגולשים בזמן תיקון, וצפייה בדפים סגורים', 330)
on conflict (key) do nothing;

create table if not exists public.page_maintenance (
  path       text primary key check (path ~ '^/[a-z0-9/*-]*$'),
  enabled    boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.page_maintenance enable row level security;
drop policy if exists page_maintenance_read on public.page_maintenance;
create policy page_maintenance_read on public.page_maintenance
  for select to anon, authenticated using (true);
revoke insert, update, delete on public.page_maintenance from anon, authenticated;

create or replace function public.admin_set_page_maintenance(p_path text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform public.assert_permission('site.maintenance');
  insert into public.page_maintenance (path, enabled, updated_by, updated_at)
  values (p_path, p_enabled, auth.uid(), now())
  on conflict (path) do update
    set enabled = excluded.enabled, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  perform public.log_admin_action(
    case when p_enabled then 'page.maintenance_on' else 'page.maintenance_off' end, 'page', p_path);
end;
$fn$;

revoke execute on function public.admin_set_page_maintenance(text, boolean) from public, anon;
grant execute on function public.admin_set_page_maintenance(text, boolean) to authenticated;

-- דף התוכניות והמחירים נפתח סגור, עד שהבעלים מחליט להשיק.
insert into public.page_maintenance (path, enabled) values ('/plans', true)
on conflict (path) do nothing;

-- סוף הקובץ
