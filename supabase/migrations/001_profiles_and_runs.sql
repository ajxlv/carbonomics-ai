-- ==========================================================
-- Carbonomics-AI: accounts, profiles and run history (Supabase)
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- Sign-ups are switched off in the dashboard; an admin creates each user.
-- ==========================================================

-- One profile per login. Users can read their own; only an admin (SQL editor / service role)
-- can create or change profiles, so a user cannot give themselves a role.
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id     UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    full_name   TEXT,
    role        TEXT NOT NULL DEFAULT 'other' CHECK (role IN ('principal', 'dean', 'admin', 'other')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every analysis or saved scenario a user runs. user_id is filled from the login token, never from the client.
CREATE TABLE IF NOT EXISTS public.runs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
    kind           TEXT NOT NULL CHECK (kind IN ('analysis', 'simulation')),
    title          TEXT CHECK (title IS NULL OR char_length(title) <= 200),
    parent_run_id  UUID REFERENCES public.runs (id) ON DELETE CASCADE,
    input          JSONB NOT NULL,      -- file name, rows, period, columns used, scenario numbers
    result         JSONB NOT NULL,      -- totals, per-period emission, forecast summary, factors used
    summary        JSONB NOT NULL DEFAULT '{}',  -- small copy of the headline numbers for the history list
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS runs_user_created_idx ON public.runs (user_id, created_at DESC);

-- A new login gets an empty profile; an admin then sets the name and role.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security: on for every table, then only what is needed.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs     ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.runs     FROM anon, authenticated;
GRANT SELECT                  ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE  ON public.runs     TO authenticated;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS runs_select_own ON public.runs;
CREATE POLICY runs_select_own ON public.runs
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS runs_insert_own ON public.runs;
CREATE POLICY runs_insert_own ON public.runs
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS runs_delete_own ON public.runs;
CREATE POLICY runs_delete_own ON public.runs
    FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
-- No UPDATE policy: a saved run cannot be edited afterwards, only deleted by its owner.
