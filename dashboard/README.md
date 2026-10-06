# Carbonomics-AI web dashboard

Static React site (Vite, Tailwind, Recharts). It only reads `public/data/dashboard.json`, which the
Python pipeline writes (`python scripts/run_pipeline.py`, step 7). No server or Python is needed to host it.

Pages: Overview, Trends, Forecast, **Simulation** (what-if accounting, no ML), **Upload your data**, Emission factors, Data & QA.
Figures from the Energy team's monthly log are labelled REAL DATA; weekly values are labelled SYNTHETIC.
The Simulation page runs the accounting formula (emission = activity × factor) in the browser — same as `src/simulation.py`.
Run `node scripts/parity_check.js` (from repo root) to verify JS and Python results agree to 2 decimal places.


## Pages and login
- Open to everyone: the home (landing) page, the login page and the demo pages (Overview to Data & QA).
- Behind a login: **Upload your data** and **History**. There is no sign-up; the team creates accounts in Supabase.
- Routes are hash based (`#home`, `#login`, `#overview`, `#upload`, `#history`, ...), so it works on any static host.

**Upload your data** and **History** are the exception to "no server": they call the Python API
(`uvicorn api.main:app --port 8000` from the repo root; see the main README) with the user's Supabase login token.
Three build-time settings, listed in `.env.example` (all public values): `VITE_API_URL`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`. The API address is fixed at build time on purpose, because the login token is sent to it.
The API must list the site in `ALLOWED_ORIGINS`. If the two Supabase settings are missing (local development), the
locked pages stay open and the API decides what it accepts (use `AUTH_DISABLED=1` locally, see `supabase/README.md`).
The demo pages work as a static site without any of this.

## Run locally
```
cd dashboard
npm install
npm run dev        # http://localhost:5173
```
Refresh the data first if needed: `python scripts/run_pipeline.py` (from the repo root).

## Build and deploy
```
npm run build      # output in dashboard/dist (relative paths, works on any host or sub-path)
```
- **Vercel / Netlify:** import the repo, set the root directory to `dashboard`. Build command `npm run build`,
  output `dist` (already in `vercel.json` / `netlify.toml`). Deploys on every push to `main`.
- **GitHub Pages:** upload `dashboard/dist` (for example with the `actions/deploy-pages` action) or push it to a `gh-pages` branch.
- **Any web server:** copy the contents of `dist/` to the document root.

`public/data/dashboard.json` is committed, so deployment works without running the pipeline.
