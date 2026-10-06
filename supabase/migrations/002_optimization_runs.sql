-- Allow saved optimization plans in the history (kind = 'optimization').
-- Run once in the Supabase SQL editor; safe to run again.
ALTER TABLE public.runs DROP CONSTRAINT IF EXISTS runs_kind_check;
ALTER TABLE public.runs
    ADD CONSTRAINT runs_kind_check CHECK (kind IN ('analysis', 'simulation', 'optimization'));
