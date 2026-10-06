# Deploying the web app

Two parts, both free to start:

| Part | What | Where | Cost |
|---|---|---|---|
| Website | `dashboard/` (React) | Vercel | free |
| API | `api/` (Python, FastAPI) | Render (`render.yaml`) | free plan |
| Login + history | Supabase | already set up | free plan |

## 1. API on Render
1. render.com > New > **Blueprint** > connect the GitHub repo. Render reads `render.yaml` and proposes the `carbonomics-api` service on the free plan.
2. It asks for three values:
   - `SUPABASE_URL` = `https://<project>.supabase.co` (no `/rest/v1/`)
   - `SUPABASE_ANON_KEY` = the public anon / publishable key
   - `ALLOWED_ORIGINS` = the website address, e.g. `https://carbonomics.vercel.app` (several allowed, comma separated; no trailing slash). If the site address is not known yet, put a placeholder and change it later in Environment.
3. Deploy. When it is live, `https://<name>.onrender.com/api/health` shows `{"status":"ok"}`.
   Do NOT set `AUTH_DISABLED`, a service-role key or the database password on the server.

## 2. Website on Vercel
1. vercel.com > Add New > Project > import the repo, **Root Directory = `dashboard`** (build settings come from `vercel.json`).
2. Environment variables (public values, see `dashboard/.env.example`):
   - `VITE_API_URL` = the Render address, e.g. `https://carbonomics-api.onrender.com`
   - `VITE_SUPABASE_URL` = `https://<project>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = the same public key
3. Deploy, then copy the site address into Render's `ALLOWED_ORIGINS` and redeploy the API if it changed.

## 3. Check
- Open the site: home page, View Demo works without login.
- Log in with a Supabase user: Upload and History open; analyse a CSV; it appears in History.
- Log out: Upload redirects to the login page.

## Known limits of the free plan
- Render free sleeps after 15 minutes without requests; the first request afterwards takes about a minute. Open the site and log in a couple of minutes before a demo. Moving to an always-on plan (Render paid or Railway) changes only the host, not the code.
- Render free has 512 MB memory and no disk. Uploads are processed in memory (limit 5 MB / 100,000 rows) and history lives in Supabase, so nothing is lost on restart. A very large file may run out of memory; use a smaller file if it does.
- Supabase free pauses after a week without activity and has no automatic backups.
