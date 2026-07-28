# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # local dev server (Next.js)
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint (eslint-config-next)
```

There is no test runner configured.

Apply schema changes with `psql "$DATABASE_URL" -f db/schema.sql` (idempotent
`create table if not exists` / `create or replace function`).

## Stack

- Next.js 16 App Router, **plain JavaScript** (no TypeScript). React 19.
- React Compiler is **enabled** (`next.config.mjs`) — do not add manual
  `useMemo` / `useCallback` without a measured reason.
- Neon Postgres via `@neondatabase/serverless`. Neon Auth
  (`@neondatabase/auth`, Better Auth-based) for email/password auth.
  ZeptoMail (Zoho) for email. Vercel Blob for equipment image storage.
- Path alias `@/*` → `src/*` (`jsconfig.json`).

## Architecture

### Auth and session flow

Cross-cutting and easy to miss:

1. `src/lib/auth/server.js` exports the server `auth` instance
   (`createNeonAuth`). `src/lib/auth/client.js` exports the browser
   `authClient` (`createAuthClient` — talks to the app's own `/api/auth/*`
   proxy, needs no env).
2. `src/app/api/auth/[...path]/route.js` mounts `auth.handler()` — it proxies
   all Better Auth endpoints (sign-in/email, sign-up/email, sign-out,
   request-password-reset, reset-password, get-session) to Neon Auth.
3. `src/proxy.js` is the Next.js middleware (named `proxy`, Next 16
   convention). It is `auth.middleware({ loginUrl: "/login" })`; public paths
   (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/api/auth`,
   assets) are excluded via the matcher, so signed-in redirects away from auth
   pages happen in those pages themselves via `getAuthUser()`.
4. Server-side code reads the session via helpers in
   `src/lib/auth/currentEmployee.js`:
   - `getCurrentEmployee()` returns `{ user, employee, roles }`, cached per
     request via React `cache()`.
   - `requireEmployee()` redirects to `/login` when missing.
   - `requireRole("admin")` (in `requireRole.js`) redirects to
     `/?error=forbidden` when the role is absent.
5. Auth users (managed by Neon Auth) are linked to `employees` rows by
   `work_email` (case-insensitive). Roles come from `employee_roles` →
   `roles`. Today only `admin` is checked, but `ctx.roles` is a list — treat
   it as such.
6. Sign-ups are restricted to `@madarth.com` client-side
   (`src/lib/auth/emailDomain.js`); the real gate is that `requireEmployee()`
   rejects any auth user without a matching `employees` row.

Gate every server action, route handler, and protected page with
`requireEmployee()` or `requireRole(...)` at the top. The middleware blocks
unauthenticated traffic but does **not** enforce roles, and there is no RLS —
the app layer is the only authorization boundary.

### Data layer convention

- `src/lib/db/client.js` exports `sql` (Neon HTTP driver, one-shot queries as
  tagged templates) and `withTransaction(fn)` (WebSocket `Pool`, interactive
  transactions; `fn` gets a pg-style client).
- Queries live in `src/lib/db/*.js` (`equipment`, `shoots`, `employees`,
  `activity`). Do not write SQL inside pages or routes; add or extend a
  helper instead.
- Helpers that used to return PostgREST nested objects keep those shapes via
  `json_build_object` (e.g. `listShoots` rows have an `employees` object) so
  UI components stay unchanged. Preserve this when editing queries.

### Equipment availability

Availability is computed by the Postgres function
`equipment_available_qty(p_equipment_id, p_start, p_end, p_exclude_shoot_id)`
(defined in `db/schema.sql`). `createShootWithEquipment` in
`src/lib/db/shoots.js` runs in a single transaction: insert the shoot, lock
the equipment rows (`for update`), insert the line items, then re-check the
function for every item. Any negative availability throws an error with
`err.code = "AVAILABILITY"`, rolling the whole transaction back. Route
handlers map that sentinel to HTTP 409 (see `src/app/api/shoots/route.js`).
Preserve this pattern when changing booking logic.

### Image uploads → Vercel Blob

Equipment images are uploaded directly from the browser to Vercel Blob using
the client-upload pattern (`@vercel/blob/client`):

- Client (`EquipmentForm.js`) calls `upload(path, file, { handleUploadUrl: "/api/upload" })`.
- Server route `src/app/api/upload/route.js` uses `handleUpload` from
  `@vercel/blob/client` to mint a one-time upload token, gated by
  `requireRole("admin")` inside `onBeforeGenerateToken`.
- `production_equipment.image_url` stores the resulting public Blob URL.

Requires `BLOB_READ_WRITE_TOKEN` (auto-injected on Vercel; `vercel env pull`
for local). Uploads are restricted to JPEG/PNG/WebP/GIF and get a random
suffix to avoid collisions. Don't switch to server-side `put()` for new
upload paths unless the file size is small and known — the 4.5 MB serverless
body limit will bite.

**Shoot photos** (`production_shoot_photos` table, two-step flow):

1. Client calls `upload()` → `POST /api/shoots/[id]/photos/upload-token` mints
   the token after verifying photographer-or-admin and the per-kind status
   gate in `canUploadPhotoKind(shoot.status, kind)` (`before` ↔ planned/in_progress,
   `after` ↔ in_progress/completed). `kind` is passed via `clientPayload`.
2. After `upload()` resolves, the client `POST`s `{ kind, url }` to
   `/api/shoots/[id]/photos` which re-checks auth + status, validates the URL
   is a `*.public.blob.vercel-storage.com` host, and inserts the row.

The second step exists because `handleUpload`'s `onUploadCompleted` callback
can't reach `localhost` in dev. Don't try to consolidate into one route by
relying solely on the callback.

### Email is fire-and-forget

`src/lib/email/zepto.js` returns `{ ok: false, skipped: true }` when env vars
are missing — it does not throw. Admin notifications in `POST /api/shoots` are
dispatched without `await` (`.then().catch(console.error)`) so SMTP latency
never blocks the API response. Recipients come from
`getAdminNotifyRecipients`: active employees with the `admin` role, then
`ADMIN_NOTIFY_EMAILS` (comma-separated), deduped.

### App Router specifics

- Server pages that depend on session state export
  `export const dynamic = "force-dynamic";` — see `src/app/page.js`. New
  authenticated pages should do the same.
- Sidebar in `src/app/layout.js` is only rendered when signed in. Its
  collapsed state is in `localStorage["production_sidebar_collapsed"]`; theme
  is applied pre-hydration from `localStorage["production_theme"]` (defaults
  to `"dark"`).
- Icons are inline SVG in `src/components/icons.js`. Extend that file rather
  than adding an icon dependency.
- Styling is hand-rolled in `src/app/globals.css` with utility-ish classes
  (`card`, `stack`, `row`, `muted`, `alert error`). No Tailwind. Reuse
  existing classes before inventing new ones.

## Environment variables

Required (see `README.md` for the full template):

- `DATABASE_URL` (Neon Postgres, pooled connection string)
- `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (≥ 32 chars; enable Auth on
  the Neon project to get the base URL)
- `ZEPTO_API_TOKEN`, `ZEPTO_API_URL`, `ZEPTO_FROM_EMAIL`, `ZEPTO_FROM_NAME`
- `ADMIN_NOTIFY_EMAILS` (optional fallback recipient list)
- `BLOB_READ_WRITE_TOKEN` (server only, for Vercel Blob image uploads)
