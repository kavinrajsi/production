# Agent guide

Context for AI coding agents working in this repo. Read this before making
changes so you stay consistent with the existing patterns.

## What this app is

An internal "Production Bookings" tool: photographers book shoots and reserve
equipment from a shared catalog; admins manage the catalog and get notified
about new bookings. See `README.md` for the user-facing overview.

## Stack and conventions

- **Next.js 16 App Router**, plain JavaScript (no TypeScript). The React
  Compiler is enabled in `next.config.mjs` — do not add manual `useMemo` /
  `useCallback` unless you have a measured reason.
- **React 19** with Server Components by default. Mark client components with
  `"use client"` only when they need state, effects, or browser APIs.
- Path alias `@/*` resolves to `src/*` (see `jsconfig.json`).
- Styling lives in `src/app/globals.css` with utility-ish classes (`card`,
  `stack`, `row`, `muted`, `alert error`, etc.). There is no Tailwind. Reuse
  existing classes before inventing new ones.
- ESM throughout (`type: module` via `.mjs` configs and ESM imports).

## Authentication and authorization

- Auth is Supabase. The middleware in `src/proxy.js` refreshes the session on
  every request and redirects unauthenticated users to `/login` (allowlist:
  `/login`, `/_next/*`, `/api/auth/*`, `/favicon.ico`).
- Server pages and route handlers get the current user via helpers in
  `src/lib/auth/currentEmployee.js`:
  - `getAuthUser()` — Supabase user or `null`
  - `getCurrentEmployee()` — `{ user, employee, roles }`; cached per request
  - `requireEmployee()` — redirects to `/login` if not signed in or missing an
    `employees` row
  - `requireRole("admin")` (in `src/lib/auth/requireRole.js`) — redirects to
    `/?error=forbidden` if the user lacks the role
- `employees` rows are matched to auth users by `work_email` (case-insensitive
  via `ilike`).
- Roles come from the `employee_roles` → `roles` join. Today only `admin` is
  checked, but treat `ctx.roles` as a list.

## Supabase clients — pick the right one

Three factories in `src/lib/supabase/`:

| Factory               | Where to call it                | Auth context                |
| --------------------- | ------------------------------- | --------------------------- |
| `client.createClient` | Client components (`"use client"`) | Browser session via cookies |
| `server.createClient` | Server components, route handlers | Server session via cookies (RLS applies) |
| `admin.createAdminClient` | Server only                  | Service role — **bypasses RLS** |

Use the admin client only when you genuinely need to bypass RLS (cross-user
writes, sending admin emails). Default to the server client so RLS is in effect.

## Data layer

Queries live in `src/lib/db/*.js`. They accept a Supabase client as the first
argument so the caller controls auth context:

- `listEquipment`, `getEquipment`, `createEquipment`, `updateEquipment`,
  `deleteEquipment`
- `listShoots`, `getShoot`, `availabilityFor`,
  `createShootWithEquipment`, `getAdminNotifyRecipients`

Availability is computed by calling the Postgres RPC
`equipment_available_qty(p_equipment_id, p_start, p_end, p_exclude_shoot_id)`.
`createShootWithEquipment` re-checks availability after insert and rolls back
(`throw` with `err.code = "AVAILABILITY"` → 409 in the route) if anything is
oversold.

## Image uploads (Vercel Blob)

Equipment images go to **Vercel Blob**, not Supabase Storage. The flow:

- Browser calls `upload()` from `@vercel/blob/client` in
  `src/app/equipment/EquipmentForm.js`.
- The client hits `POST /api/upload` (`src/app/api/upload/route.js`), which
  uses `handleUpload` to mint a short-lived token. The route gates with
  `requireRole("admin")` inside `onBeforeGenerateToken` — that's where you
  add any extra checks (size, content type are already constrained there).
- The browser uploads the file straight to Blob and we save the returned
  public URL to `production_equipment.image_url`.

Requires `BLOB_READ_WRITE_TOKEN` (auto on Vercel; `vercel env pull` locally).
Use this client-upload pattern for any new file uploads — server-side `put()`
hits the 4.5 MB serverless body limit.

**Shoot photos** follow the same client-upload flow but with a two-step
record:

1. `POST /api/shoots/[id]/photos/upload-token` — `handleUpload` token mint,
   gated by photographer-or-admin and `canUploadPhotoKind(shoot.status, kind)`
   in `src/lib/db/shoots.js`. `kind` comes through `clientPayload`.
2. After `upload()` resolves the client `POST`s `{ kind, url }` to
   `/api/shoots/[id]/photos` which inserts a `production_shoot_photos` row
   (after re-checking auth, status, and that the URL is a Vercel Blob host).

Step 2 exists because `onUploadCompleted` can't reach localhost from Vercel
in dev — don't drop it to consolidate routes.

## Email

`src/lib/email/zepto.js` posts to ZeptoMail. It returns `{ ok: false, skipped: true }`
if `ZEPTO_API_TOKEN` or `ZEPTO_FROM_EMAIL` is missing — it does **not** throw.
Templates live in `src/lib/email/templates/`.

Admin notifications fan out via `getAdminNotifyRecipients`:
1. employees with the `admin` role and `employee_status = 'active'`, then
2. addresses from `ADMIN_NOTIFY_EMAILS` (comma-separated), deduped.

Send calls are fire-and-forget (`.then().catch(console.error)`) so a slow or
failing SMTP path never blocks the API response.

## Routing map

- Pages: `src/app/{login,shoots,shoots/new,shoots/[id],equipment,profile,users,admin/equipment,admin/equipment/[id],admin/equipment/new,admin/activity}`
- API: `src/app/api/{equipment,equipment/[id],shoots,shoots/availability}/route.js`
- Server pages that depend on session state should export
  `export const dynamic = "force-dynamic";` (see `src/app/page.js`).

## Sidebar and theming

- `src/components/Sidebar.js` is rendered in `layout.js` only when signed in.
  The collapsed state is persisted in `localStorage` under
  `production_sidebar_collapsed`.
- Theme is applied pre-hydration via an inline script in `layout.js` reading
  `localStorage["production_theme"]` (defaults to `"dark"`).
- Icons are inline SVG components in `src/components/icons.js` — extend that
  file rather than importing an icon library.

## When you add code

- Prefer Server Components and server-side data fetching. Only reach for a
  client component when you truly need interactivity.
- Use the existing `db/` helpers; don't sprinkle raw `from("...")` calls
  through pages.
- For new server actions or route handlers, gate them with `requireEmployee()`
  or `requireRole("admin")` at the top — do not trust the client.
- Validate request bodies in route handlers and return JSON `{ error }` with
  an appropriate status code, matching the existing routes' style.
- Treat `AVAILABILITY` as a sentinel error code from the shoots layer so
  callers can map it to a 409.

## Environment variables

See `README.md` for the full list. Quick reference:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — client and server
- `SUPABASE_SERVICE_ROLE_KEY` — server only, used by `createAdminClient`
- `ZEPTO_API_TOKEN`, `ZEPTO_API_URL`, `ZEPTO_FROM_EMAIL`, `ZEPTO_FROM_NAME`
- `ADMIN_NOTIFY_EMAILS` — optional fallback recipient list
- `BLOB_READ_WRITE_TOKEN` — server only, used by `POST /api/upload`

## Commands

```bash
npm run dev     # local dev
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

There is currently no test runner configured. If you add tests, wire them into
`package.json` and document the command here.
