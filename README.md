# Production Bookings

An internal Next.js app for photographers to book shoots and reserve equipment
from a shared catalog. Admins manage the catalog and receive email notifications
when new shoots are booked.

## Tech stack

- **Next.js 16** (App Router, JavaScript) with the React Compiler enabled
- **React 19**
- **Neon** Postgres (`@neondatabase/serverless`) with **Neon Auth**
  (`@neondatabase/auth`) for email/password authentication
- **ZeptoMail** (Zoho) for transactional email
- **ESLint 9** (`eslint-config-next`)

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` at the repo root:

   ```bash
   # Neon Postgres
   DATABASE_URL=postgresql://<user>:<password>@<pooler-host>/<db>?sslmode=require

   # Neon Auth (enable Auth on the Neon project to get the base URL;
   # generate the cookie secret with: openssl rand -base64 32)
   NEON_AUTH_BASE_URL=https://<your-neon-auth-url>.neon.tech
   NEON_AUTH_COOKIE_SECRET=<at-least-32-chars>

   # ZeptoMail (Zoho)
   ZEPTO_API_TOKEN=Zoho-enczapikey <token>
   ZEPTO_API_URL=https://api.zeptomail.<region>/v1.1/email
   ZEPTO_FROM_EMAIL=admin@example.com
   ZEPTO_FROM_NAME=<Your Sender Name>

   # Optional fallback admin notification list (comma-separated)
   ADMIN_NOTIFY_EMAILS=

   # Vercel Blob (equipment image uploads)
   BLOB_READ_WRITE_TOKEN=<vercel-blob-token>
   ```

   `BLOB_READ_WRITE_TOKEN` is auto-injected on Vercel deploys once you create a
   Blob store and link it to the project. For local dev, run
   `vercel env pull .env.local` to fetch it.

3. Apply the schema to your Neon database:

   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>. Unauthenticated requests are redirected to
   `/login` by the proxy middleware in `src/proxy.js`.

## Scripts

| Script          | Purpose                       |
| --------------- | ----------------------------- |
| `npm run dev`   | Start the Next.js dev server  |
| `npm run build` | Production build              |
| `npm run start` | Serve the production build    |
| `npm run lint`  | Run ESLint                    |

## Database

The schema lives in `db/schema.sql` and creates:

- `employees` — keyed by `work_email` (matched case-insensitively against the
  auth user's email)
- `roles`, `employee_roles` — role assignments (`admin`, etc.)
- `production_equipment` — catalog items with `quantity` and `is_active`
- `production_shoots` — shoot bookings
- `production_shoot_equipment` — line items linking shoots to equipment
- `production_shoot_photos` — before/after photo records
- `activity_logs` — admin activity feed
- Function `equipment_available_qty(p_equipment_id, p_start, p_end, p_exclude_shoot_id)`
  — returns the remaining available units in a date range

Auth users live in Neon Auth (managed); an employee row with a matching
`work_email` must exist before a signed-in user can use the app.

## Routes

| Path                       | Who      | Purpose                                       |
| -------------------------- | -------- | --------------------------------------------- |
| `/`                        | employee | Dashboard                                     |
| `/login`                   | public   | Email/password sign-in via Neon Auth          |
| `/shoots`                  | employee | List shoots                                   |
| `/shoots/new`              | employee | Book a shoot and pick equipment               |
| `/shoots/[id]`             | employee | Shoot detail                                  |
| `/shoots/[id]/photos`      | employee | View / upload before & after photos           |
| `/equipment`               | employee | Browse the equipment catalog (admins also see retired items + add/edit/delete) |
| `/equipment/new`           | admin    | Add a catalog item                            |
| `/equipment/[id]/edit`     | admin    | Edit a catalog item                           |
| `/profile`, `/users`       | employee | Profile and directory                         |
| `/admin/activity`          | admin    | Activity log                                  |
| `POST /api/equipment`      | admin    | Create catalog item                           |
| `POST /api/shoots`         | employee | Create a shoot with reserved equipment        |
| `/api/shoots/availability` | employee | Availability check for a date range           |
| `POST /api/upload`         | admin    | Vercel Blob client-upload token (equipment)   |
| `POST /api/shoots/[id]/photos/upload-token` | photographer/admin | Vercel Blob client-upload token (shoot photos) |
| `POST /api/shoots/[id]/photos`              | photographer/admin | Record an uploaded shoot photo (kind + url) |
| `PATCH /api/shoots/[id]`                    | photographer/admin | Update shoot status (forward-only)          |

## Project layout

```
db/
  schema.sql      Postgres schema for Neon
src/
  app/            App Router pages and API routes
  components/     Sidebar, theme toggle, icons
  lib/
    auth/         Neon Auth server/client instances, session and role helpers
    db/           Neon SQL client and queries (equipment, shoots, employees)
    email/        ZeptoMail client and templates
  proxy.js        Auth middleware (redirects to /login)
```

## Deployment

Deployable to any Node host that supports Next.js 16; Vercel is the default
target. Set the env vars above in the host's environment configuration.
