-- PetLink — נתוני יסוד: קטלוג הרשאות, תפקידים מוכנים, קטגוריות ופילטרים.
-- נמצא ב-migration (ולא ב-seed) כי גם הסביבה החיה צריכה אותם.
-- אחרי ההשקה, קטגוריות ופילטרים נערכים מפאנל האדמין בלבד.

-- ─────────────────────────────────────────────────────────────
-- הרשאות (חייב להתאים ל-src/lib/auth/permissions.ts)
-- פעולות שהן של הבעלים בלבד — מחיקה לצמיתות, ניהול מנהלים והרשאות,
-- צפייה בהכנסות — אינן הרשאות, ולכן אי אפשר להעניק אותן לעובד.
-- ─────────────────────────────────────────────────────────────

insert into public.permissions (key, group_key, label, description, sort_order) values
  ('dashboard.view',         'general',       'צפייה בדשבורד',          'נרשמים חדשים, קטגוריות וערים פעילות (בלי הכנסות)', 10),
  ('audit.view',             'general',       'צפייה ביומן הפעולות',    null, 20),

  ('users.view',             'users',         'צפייה במשתמשים',          'חיפוש וכרטיס משתמש', 100),
  ('users.lock',             'users',         'נעילה ושחרור',            null, 110),
  ('users.block',            'users',         'חסימה',                   null, 120),
  ('users.reset_password',   'users',         'איפוס סיסמה',             null, 130),
  ('users.message',          'users',         'שליחת הודעה למשתמש',     null, 140),
  ('users.delete',           'users',         'מחיקת משתמש',             'השבתה ומחיקה רכה. מחיקה לצמיתות — לבעלים בלבד', 150),

  ('businesses.view',        'businesses',    'צפייה בעסקים',            null, 200),
  ('businesses.approve',     'businesses',    'אישור והשהיית עסקים',    null, 210),
  ('businesses.edit',        'businesses',    'עריכת עסקים',             null, 220),
  ('businesses.feature',     'businesses',    'סימון עסק כמומלץ',       null, 230),
  ('businesses.remove',      'businesses',    'הסרת עסק',                null, 240),

  ('reviews.moderate',       'content',       'טיפול בביקורות ודיווחים', null, 300),
  ('adoption.manage',        'content',       'ניהול ימי אימוץ ועמותות', null, 310),
  ('catalog.manage',         'content',       'ניהול קטגוריות ופילטרים', null, 320),

  ('banners.manage',         'advertising',   'ניהול באנרים',            null, 400),
  ('banners.reports',        'advertising',   'דוחות פרסום',             null, 410),

  ('subscriptions.view',     'billing',       'צפייה במנויים ותשלומים', 'מי משלם ומי בפיגור (בלי סכומי הכנסות מצטברים)', 500),
  ('coupons.manage',         'billing',       'ניהול קודי הנחה',        null, 510);

-- ─────────────────────────────────────────────────────────────
-- תפקידים מוכנים
-- ─────────────────────────────────────────────────────────────

insert into public.staff_roles (key, name, description, is_system) values
  ('customer_support', 'שירות לקוחות', 'צפייה במשתמשים, נעילה ועזרה, בלי מחיקה', true),
  ('content_manager',  'מנהל תוכן',    'אישור עסקים, ביקורות וימי אימוץ',        true),
  ('advertising',      'פרסום',        'באנרים ודוחות',                          true);

insert into public.staff_role_permissions (role_id, permission_key)
select r.id, p.key
from public.staff_roles r
join (values
  ('customer_support', 'dashboard.view'),
  ('customer_support', 'users.view'),
  ('customer_support', 'users.lock'),
  ('customer_support', 'users.reset_password'),
  ('customer_support', 'users.message'),
  ('customer_support', 'businesses.view'),

  ('content_manager',  'dashboard.view'),
  ('content_manager',  'businesses.view'),
  ('content_manager',  'businesses.approve'),
  ('content_manager',  'businesses.edit'),
  ('content_manager',  'reviews.moderate'),
  ('content_manager',  'adoption.manage'),

  ('advertising',      'dashboard.view'),
  ('advertising',      'banners.manage'),
  ('advertising',      'banners.reports')
) as p(role_key, key) on p.role_key = r.key;

-- ─────────────────────────────────────────────────────────────
-- קטגוריות
-- ─────────────────────────────────────────────────────────────

insert into public.categories (slug, name, icon, sort_order) values
  ('vets',     'וטרינרים',                 'stethoscope', 10),
  ('trainers', 'מאלפים',                   'dog',         20),
  ('shops',    'חנויות מזון וצעצועים',     'store',       30),
  ('grooming', 'ספרים ומעצבי שיער לחיות', 'scissors',    40),
  ('adoption', 'ימי אימוץ',                'heart',       50);

-- ─────────────────────────────────────────────────────────────
-- פילטרים (נקודות הבידול מול גוגל מפות)
-- ─────────────────────────────────────────────────────────────

insert into public.filters (key, name, kind, options, is_featured, sort_order) values
  ('home_visits',   'מגיע לבית הלקוח',        'boolean',      '[]', true,  10),
  ('open_weekends', 'עובד בשישי, שבת וחגים',  'boolean',      '[]', true,  20),
  ('open_now',      'פתוח עכשיו',             'open_now',     '[]', true,  30),
  ('distance',      'מרחק',                   'distance',     '[]', false, 40),
  ('animal_types',  'סוג חיה',                'multi_select',
    '[{"value": "dog", "label": "כלב"}, {"value": "cat", "label": "חתול"}, {"value": "other", "label": "אחר"}]',
    false, 50);
