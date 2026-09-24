@AGENTS.md

# PetLink

Hebrew-only (RTL), mobile-first directory of pet services in Israel. Read
`docs/SPEC.md` (product spec, Hebrew) before building a feature — items marked
**[פתוח]** are undecided and must be confirmed with the owner first.
Stack rationale: `docs/STACK.md`.

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

## Design ("Liquid Glass")
- Tokens and utilities live in `src/app/globals.css`: `glass`, `glass-strong`,
  `glass-glow` (pointer-following highlight), `pressable` (spring hover/press),
  `focus-ring`, `animate-rise` (stagger with `style={{"--i": n}}`).
- Components in `src/components/ui` (`Button`/`buttonClass`, `Card`, `Input`,
  `Badge`, `Avatar`, …) and `src/components/{dialog,toast}.tsx`. Icons: `lucide-react`.
- Page transitions: wrap each page in `<PageTransition>`; links opt in with
  `transitionTypes={["nav-forward"]}` / `["nav-back"]`. In RTL, forward moves left.
- Every screen must work in light and dark mode and at 390px width.

## Commands
- `npm run db:start` — local Supabase (Docker); applies migrations.
- `npm run db:reset` — rebuild local DB from migrations.
- `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`.
