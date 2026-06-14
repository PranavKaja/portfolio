# Backend Setup — Projects DB + Ops Console

This copy of the portfolio is wired to a **Supabase** (Postgres) backend so projects
live in a database and you manage them from a hidden admin panel — no more editing
HTML per project. It runs **fully offline** until you add credentials (it falls back
to `data/projects.json`), so nothing breaks before setup.

> This folder has **no git** and is **not** linked to your live Vercel site. Test freely.

---

## What's built (this milestone)

| Piece | File(s) |
|---|---|
| Projects table + status badges + security rules | `supabase/schema.sql` |
| Seed data (your 9 missions) | `supabase/seed.sql` |
| Live dossier sync — site reads projects from the DB | `missions.js`, `index.html` |
| Offline fallback / seed source | `data/projects.json` |
| Ops Console — login + add/edit/delete projects | `admin.html`, `admin.js`, `admin.css` |
| Connection config | `config.js` |
| **Transmission Log** — public contact form | `contact.html`, `contact.js` |
| Inbound messages table + security | `supabase/transmissions.sql` |
| Ops Console **Transmissions** inbox tab | `admin.html`, `admin.js` |
| **Visitor Intel** — anonymous analytics tracker | `analytics.js` |
| Events table + admin-only dashboard function | `supabase/analytics.sql` |
| Ops Console **Intel** dashboard tab | `admin.html`, `admin.js`, `admin.css` |

Status badges supported: **deployed**, **in_progress**, **archived**, **classified**.
Message statuses: **received**, **decoded**, **replied** (+ a priority **flag**).
Tracked events: **pageview**, **project_click**, **resume_download**, **contact_submit**, **game_score**.

---

## One-time Supabase setup (~10 min)

### 1. Create a project
1. Go to <https://supabase.com> → sign in → **New project**.
2. Pick a name + database password (save it) + region near you. Free tier is fine.

### 2. Create the table
1. In the project, open **SQL Editor → New query**.
2. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. New query → paste [`supabase/seed.sql`](supabase/seed.sql) → **Run**. (Loads your 9 projects.)
4. New query → paste [`supabase/transmissions.sql`](supabase/transmissions.sql) → **Run**. (Contact inbox.)
5. New query → paste [`supabase/analytics.sql`](supabase/analytics.sql) → **Run**. (Visitor Intel.)

> Or skip the four files and run [`supabase/setup_all.sql`](supabase/setup_all.sql) once — it bundles all of them.

### 3. Connect the front-end
1. **Project Settings → API**.
2. Copy **Project URL** and the **`anon` `public`** key.
3. Open [`config.js`](config.js) and paste them in:
   ```js
   window.PORTFOLIO_CONFIG = {
     SUPABASE_URL: "https://xxxxx.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGci...."
   };
   ```
   > The `anon` key is **safe to ship in the browser** — Row Level Security (in `schema.sql`)
   > is what protects writes. Do **not** use the `service_role` key here.

### 4. Create your admin login
1. **Authentication → Users → Add user** → enter your email + a password → create.
   (Or **Add user** → "Auto Confirm" so you can log in immediately.)
2. That email/password is what you'll use at `/admin.html`.

### 5. ⚠️ REQUIRED — disable public signups
The admin policies grant access to **any authenticated user**, and the publishable key is
public (it's in the browser). If self-signup is left on, **anyone can register and gain admin
access** — reading your contact inbox and editing your projects. Close it:

- **Authentication → Sign In / Up** → turn **off** "Allow new users to sign up" → **Save changes**.
- Confirm "Allow anonymous sign-ins" is also off.

You create your admin manually (step 4), so you never need self-signup.

> Optional extra hardening:
> - **Authentication → Settings** → enable **leaked-password protection** (HaveIBeenPwned check).
> - On an existing database, pin the trigger's search_path (already baked into `schema.sql` for
>   fresh installs):
>   ```sql
>   alter function public.set_updated_at() set search_path = pg_catalog;
>   ```

---

## Run it locally

Any static server works. This folder ships one:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .claude\server.ps1
# serves http://localhost:8741/
```

- Site: <http://localhost:8741/>  → projects now load from Supabase.
- Admin: <http://localhost:8741/admin.html> → log in, then add/edit/delete projects.

Edit a project's **status** or **published** flag in the admin, reload the site, and the
card badge / visibility updates live. Set **published = off** to hide a project without deleting it.

### Transmission Log (contact inbox)
- Visitors submit the form on `/contact` → a row lands in the `messages` table.
- In the Ops Console, open the **Transmissions** tab to read them. Each message shows the
  sender's name/email/phone and body, with buttons to set status
  (**received → decoded → replied**), a **★ flag** for priority, and **delete**.
- The tab shows an unread count (messages still `received`).
- **Security:** anyone can *submit* (anon insert, size-limited) but only the signed-in admin
  can *read* the inbox — visitors can never see each other's messages.
- If Supabase isn't configured, the form falls back to opening a prefilled email, so it's
  never a dead end. A hidden honeypot field drops naive spam bots; for heavier spam
  protection add a Vercel function with rate limiting later.

### Visitor Intel (analytics)
- `analytics.js` loads on every public page and logs anonymous events to the `events` table:
  page views (+ traffic source from the referrer), project opens, resume downloads, contact
  submits, and WASD-game scores.
- Open the **Intel** tab in the Ops Console for the dashboard: KPI cards, traffic sources,
  top projects, top pages, game stats, and a 30-day page-view chart.
- **Privacy:** no cookies, no IP, no names — just a random `localStorage` session id and a
  normalized referrer. It **honors Do Not Track** (tracking is skipped entirely if the
  browser sends DNT).
- **Security:** the public can *write* events (anon insert, size-limited) but the dashboard
  function (`intel_dashboard()`) is `EXECUTE`-granted to **authenticated only** — visitors
  can never read the analytics back.

---

## How the data flows

```
Ops Console (admin.html)  --writes-->  Supabase: projects table  <--reads--  Site (missions.js)
                                              │
                                   (RLS: anon reads published only,
                                    authenticated admin reads+writes all)
```

If Supabase is unreachable or unconfigured, `missions.js` falls back to `data/projects.json`,
so the public site always renders.

---

## Deploying (when ready)

It stays a static site on Vercel:
- Commit `config.js` with your real URL + anon key (the anon key is public-safe).
- **Protect the admin page.** `admin.html` has `noindex`, but for real privacy add Vercel
  password protection or move it behind a non-obvious path. (Auth still gates all writes
  regardless — RLS means an anon visitor can only read published rows.)

---

## Known limitation

The WASD car-game text-scatter easter egg won't scatter the *project card* text anymore,
because cards are now injected after the game wraps the page text. Everything else
(overlay, carousel, hover preview, badges) works on the dynamic cards. Fixable later by
re-running the wrap after render if you want it back.

---

## Next systems (not built yet)

- Server-only bits (email-on-new-message, contact-form & event-tracking rate limiting) → small Vercel functions
- Optional: per-project deep-dive pages, richer charts, date-range filters on the Intel dashboard
