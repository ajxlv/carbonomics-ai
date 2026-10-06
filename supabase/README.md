# Supabase setup (login and history)

The API checks a Supabase login on every route except `/api/health`, and saves each analysis and
saved scenario to the logged-in user's history. Users only ever see their own runs (Row Level Security).

## One-time setup
1. Create a Supabase project. In **Authentication**, switch **"Allow new users to sign up" off**, then create
   each account (Principal, Dean, ...) yourself. Confirm the project uses asymmetric JWT signing keys
   (the API verifies tokens with the project's public JWKS; HS256 shared-secret projects are not supported).
2. In the SQL editor run `migrations/001_profiles_and_runs.sql` (safe to run again).
3. Give each user a name and role (only an admin can, from the SQL editor):
   `update public.profiles set full_name = 'Dr. ...', role = 'principal' where user_id = '<id>';`
4. Set these on the API host (never in the repo or the browser):
   - `SUPABASE_URL` = `https://<project>.supabase.co`
   - `SUPABASE_ANON_KEY` = the public anon / publishable key
   - `ALLOWED_ORIGINS` = the site address(es), comma separated
   The service-role key and the database password are not used and must not be set.
5. Local development without Supabase: `AUTH_DISABLED=1 uvicorn api.main:app --port 8000`
   (no login check, no history). Never set this on a real server.

## Tests
- `pytest` covers the login check (fake signing key) and the history calls (fake REST API).
- `tests/rls_test.sql` checks the database rules (a user cannot see, add or delete another user's run;
  nobody can edit a saved run or write profiles; anonymous gets nothing). To run it on a scratch
  PostgreSQL: create roles `anon` and `authenticated`, a minimal `auth` schema (`auth.users`, `auth.uid()`
  reading `request.jwt.claims`), apply the migration, insert two users with ids ending `...0a` and `...0b`, then run the file.
  On a real Supabase project, do the same in a branch or a spare project, not the live one.

## Known limits
- Free plan: the project pauses after a week without activity and has no automatic backups (check the
  current Supabase pricing page before relying on it).
- A saved run over 2 MB is stored without its per-period arrays (`truncated: true`).
