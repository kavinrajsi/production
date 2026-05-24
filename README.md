# Production Bookings

An internal Next.js app for photographers to book shoots and reserve equipment
from a shared catalog. Admins manage the catalog and receive email notifications
when new shoots are booked.

## Tech stack

- **Next.js 16** (App Router, JavaScript) with the React Compiler enabled
- **React 19**
- **Supabase** for authentication, Postgres, and Row Level Security
- **ZeptoMail** (Zoho) for transactional email
- **ESLint 9** (`eslint-config-next`)

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` at the repo root:

   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

   # ZeptoMail (Zoho)
   ZEPTO_API_TOKEN=Zoho-enczapikey <token>
   ZEPTO_API_URL=https://api.zeptomail.<region>/v1.1/email
   ZEPTO_FROM_EMAIL=admin@example.com
   ZEPTO_FROM_NAME=<Your Sender Name>

   # Optional fallback admin notification list (comma-separated)
   ADMIN_NOTIFY_EMAILS=
   ```

   The service-role key is used only on the server (admin actions, availability
   checks, fire-and-forget emails). Never expose it to the client.

3. Run the dev server:

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

The app expects these Supabase tables and RPCs:

- `employees` — keyed by `work_email` (matched against the auth user)
- `roles`, `employee_roles` — role assignments (`admin`, etc.)
- `production_equipment` — catalog items with `quantity` and `is_active`
- `production_shoots` — shoot bookings
- `production_shoot_equipment` — line items linking shoots to equipment
- RPC `equipment_available_qty(p_equipment_id, p_start, p_end, p_exclude_shoot_id)`
  — returns the remaining available units in a date range

## Routes

| Path                       | Who      | Purpose                                       |
| -------------------------- | -------- | --------------------------------------------- |
| `/`                        | employee | Dashboard                                     |
| `/login`                   | public   | Email/password sign-in via Supabase           |
| `/shoots`                  | employee | List shoots                                   |
| `/shoots/new`              | employee | Book a shoot and pick equipment               |
| `/shoots/[id]`             | employee | Shoot detail                                  |
| `/equipment`               | employee | Browse the equipment catalog                  |
| `/profile`, `/users`       | employee | Profile and directory                         |
| `/admin/equipment`         | admin    | Manage catalog (create, edit, retire)         |
| `/admin/activity`          | admin    | Activity log                                  |
| `POST /api/equipment`      | admin    | Create catalog item                           |
| `POST /api/shoots`         | employee | Create a shoot with reserved equipment        |
| `/api/shoots/availability` | employee | Availability check for a date range           |

## Project layout

```
src/
  app/            App Router pages and API routes
  components/     Sidebar, theme toggle, icons
  lib/
    auth/         Session and role helpers
    db/           Supabase queries (equipment, shoots)
    email/        ZeptoMail client and templates
    supabase/     Browser, server, and admin client factories
  proxy.js        Auth middleware (redirects to /login)
```

## Deployment

Deployable to any Node host that supports Next.js 16; Vercel is the default
target. Set the env vars above in the host's environment configuration.
