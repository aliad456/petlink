@AGENTS.md

# Kami (formerly PetLink)

The brand is **Kami**; the repo and some internal names still say `petlink`.
Logo assets: `public/brand/` (cut from the owner's artwork), favicon/app icons in
`src/app/{favicon.ico,icon.png,apple-icon.png}` and `public/icons/`. Use `<Logo>` from
`src/components/logo.tsx`; never re-draw the logo. Brand name in code: `SITE_NAME` in `src/lib/site.ts`.


Hebrew-only (RTL), mobile-first directory of pet services in Israel. Read
`docs/SPEC.md` (product spec, Hebrew) before building a feature — items marked
**[פתוח]** are undecided and must be confirmed with the owner first.
Stack rationale: `docs/STACK.md`. **Current status, next steps and decisions:
`docs/ROADMAP.md`** — read it first and update it when a stage finishes.

## Stack
- Next.js 16 App Router (`src/app`), TypeScript, Tailwind v4. Middleware is `src/proxy.ts`.
- Supabase: Postgres + Auth + Storage. Schema lives only in `supabase/migrations/`.

## Rules
- **Authorization is enforced in the database.** Every table has RLS. Admin
  checks go through `public.has_permission(key)`, which requires an aal2 (2FA)
  session. UI/server guards (`requireStaff`, `requirePermission`, `requireOwner`
  in `src/lib/auth/session.ts`) are a second layer, not a replacement.
- Owner-only actions (permanent delete, managing staff/permissions, revenue)
  are **not** permissions — check `is_owner()` / `requireOwner()`.
- New permission → add it in a migration **and** in `src/lib/auth/permissions.ts`.
- Every admin mutation writes to `audit_log` via `public.log_admin_action(...)`.
  The audit log is append-only.
- `createAdminClient()` (secret key, bypasses RLS) only after a permission
  check, and only for what RLS can't do (e.g. auth admin API).
- User-facing copy is Hebrew. Use `dir="ltr"` on email/phone/code inputs.
- Categories and filters are data, edited from the admin panel — never hardcode them.
- Admin actions on users go through a `public.admin_*` SQL function (authorizes +
  audits in one transaction); only then may a server action call the Auth Admin
  API (ban, reset email, delete). See `src/app/admin/(panel)/users/[id]/actions.ts`.

- Businesses may have no owner (`owner_id is null`, `source = 'staff'`): "unclaimed" pages staff
  create from public info. Ownership moves only via `admin_review_claim` after manual verification.
- Site statistics: `/api/track` + `<SiteTracker>` (no cookies; daily-rotating hashed visitor id), read
  only through `admin_site_stats()` / `admin_live_now()`. Don't add third-party analytics without
  updating the privacy policy.
- Business hours/filter editors are shared: `src/components/business/detail-editors.tsx`. Bulk import
  parsing (table, hours text) is in `src/lib/business/import.ts`.
- Legal pages live in `src/app/(site)/{terms,privacy,business-terms,accessibility}`; operator
  details and `TERMS_VERSION` in `src/lib/legal.ts`. Bump the version when terms change materially.
- Don't export non-component values from `"use client"` files or non-functions from `"use server"`
  files for server use — put shared constants in `src/lib/*`.

## Design ("Liquid Glass")
- Tokens and utilities live in `src/app/globals.css`: `glass`, `glass-strong`,
  `glass-glow` (pointer-following highlight), `pressable` (spring hover/press),
  `focus-ring`, `animate-rise` (stagger with `style={{"--i": n}}`).
- Components in `src/components/ui` (`Button`/`buttonClass`, `Card`, `Input`,
  `Badge`, `Avatar`, …) and `src/components/{dialog,toast}.tsx`. Icons: `lucide-react`.
- Page transitions: wrap each page in `<PageTransition>`; links opt in with
  `transitionTypes={["nav-forward"]}` / `["nav-back"]`. In RTL, forward moves left.
- Every screen must work in light and dark mode and at 390px width.

## Performance (the owner wants navigation to feel instant)
- Vercel functions run in `fra1` (vercel.json), next to Supabase in Frankfurt. Keep them together.
- Public pages live in `src/app/(site)/` under a layout that renders the header once.
  Every route there has a `loading.tsx` skeleton (`src/components/skeletons.tsx`).
- Reference data (categories, filters, cities, "new on Kami") is cached with
  `unstable_cache` in `src/lib/catalog.ts` via a cookie-less client; call
  `revalidateTag(CATALOG_TAG | BUSINESSES_TAG, { expire: 0 })` after changing it.
- The proxy skips Supabase entirely when there's no auth cookie.
- Lists use `glass-lite` (no backdrop-filter); keep `glass` for single surfaces.
  Don't animate `filter`/blur; animate `transform`/`opacity` only.
- Business photos go through `next/image` with `sizes`.
- Category links use `prefetch`; `staleTimes` keeps visited pages for 30s.

## Workflow
- Work on the session's branch; after every push make sure an open PR exists
  (a merged PR can't take new commits — open a new one) and send the owner its link.
- A PR that adds a migration must say so: the owner runs it in Supabase → SQL Editor before merging.

## Commands
- `npm run db:start` — local Supabase (Docker); applies migrations.
- `npm run db:reset` — rebuild local DB from migrations.
- `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`.
