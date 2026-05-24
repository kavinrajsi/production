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

## Stack

- Next.js 16 App Router, **plain JavaScript** (no TypeScript). React 19.
- React Compiler is **enabled** (`next.config.mjs`) — do not add manual
  `useMemo` / `useCallback` without a measured reason.
- Supabase for auth + Postgres. ZeptoMail (Zoho) for email. Vercel Blob for
  equipment image storage.
- Path alias `@/*` → `src/*` (`jsconfig.json`).

## Architecture

### Auth and session flow

Cross-cutting and easy to miss:

1. `src/proxy.js` is the Next.js middleware (it just happens to be named
   `proxy` instead of `middleware`). It refreshes the Supabase session on every
   request and redirects unauthenticated traffic to `/login`. Allowlist:
   `/login`, `/_next/*`, `/api/auth/*`, `/favicon.ico`.
2. Server-side code reads the session via helpers in
   `src/lib/auth/currentEmployee.js`:
   - `getCurrentEmployee()` returns `{ user, employee, roles }`, cached per
     request via React `cache()`.
   - `requireEmployee()` redirects to `/login` when missing.
   - `requireRole("admin")` (in `requireRole.js`) redirects to
     `/?error=forbidden` when the role is absent.
3. Auth users are linked to `employees` rows by `work_email`
   (case-insensitive). Roles come from `employee_roles` → `roles`. Today only
   `admin` is checked, but `ctx.roles` is a list — treat it as such.

Gate every server action, route handler, and protected page with
`requireEmployee()` or `requireRole(...)` at the top. The middleware blocks
unauthenticated traffic but does **not** enforce roles.

### Three Supabase clients — pick the right one

In `src/lib/supabase/`:

| Factory                   | Use from                            | Auth context                          |
| ------------------------- | ----------------------------------- | ------------------------------------- |
| `client.createClient`     | Client components (`"use client"`)  | Browser session via cookies           |
| `server.createClient`     | Server components / route handlers  | Server session via cookies (RLS on)   |
| `admin.createAdminClient` | Server only                         | Service role — **bypasses RLS**       |

Default to the server client so RLS applies. Use the admin client only when
you genuinely need to bypass RLS (cross-user writes, admin emails). The admin
client is what `POST /api/shoots` uses to insert a shoot on behalf of the
employee and run the availability re-check.

### Data layer convention

Queries live in `src/lib/db/*.js` and accept a Supabase client as the **first
argument** — the caller decides which client (and therefore which auth
context) to use. Do not reach for `from("...")` directly inside pages or
routes; add or extend a helper instead.

### Equipment availability

Availability is computed by the Postgres RPC
`equipment_available_qty(p_equipment_id, p_start, p_end, p_exclude_shoot_id)`.
`createShootWithEquipment` in `src/lib/db/shoots.js` inserts the shoot, links
the items, then re-runs the RPC for every line item. If any availability is
negative, it deletes the just-inserted shoot and throws an error with
`err.code = "AVAILABILITY"`. Route handlers map that sentinel to HTTP 409
(see `src/app/api/shoots/route.js`). Preserve this pattern when changing
booking logic.

### Image uploads → Vercel Blob

Equipment images are uploaded directly from the browser to Vercel Blob using
the client-upload pattern (`@vercel/blob/client`):

- Client (`EquipmentForm.js`) calls `upload(path, file, { handleUploadUrl: "/api/upload" })`.
- Server route `src/app/api/upload/route.js` uses `handleUpload` from
  `@vercel/blob/client` to mint a one-time upload token, gated by
  `requireRole("admin")` inside `onBeforeGenerateToken`.
- `production_equipment.image_url` stores the resulting public Blob URL — the
  DB schema is unchanged, just a different host.

Requires `BLOB_READ_WRITE_TOKEN` (auto-injected on Vercel; `vercel env pull`
for local). Uploads are restricted to JPEG/PNG/WebP/GIF up to 10 MB and get a
random suffix to avoid collisions. Don't switch to server-side `put()` for new
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

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `ZEPTO_API_TOKEN`, `ZEPTO_API_URL`, `ZEPTO_FROM_EMAIL`, `ZEPTO_FROM_NAME`
- `ADMIN_NOTIFY_EMAILS` (optional fallback recipient list)
- `BLOB_READ_WRITE_TOKEN` (server only, for Vercel Blob image uploads)
