-- RLS checks. Run in a throwaway database that has the migration applied and two users
-- (see supabase/README.md). Each block raises an exception if the rule is broken.
-- Uses the standard Supabase way of acting as a user: set role + request.jwt.claims.

DO $$
DECLARE
    a UUID := '00000000-0000-0000-0000-00000000000a';
    b UUID := '00000000-0000-0000-0000-00000000000b';
    n INT;
    rid UUID;
BEGIN
    -- user A saves a run; user_id comes from the token, not from the client
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.runs (kind, input, result) VALUES ('analysis', '{}', '{}') RETURNING id INTO rid;
    SELECT count(*) INTO n FROM public.runs;
    IF n <> 1 THEN RAISE EXCEPTION 'A should see exactly their own run, saw %', n; END IF;

    -- A cannot save a run in B's name
    BEGIN
        INSERT INTO public.runs (user_id, kind, input, result) VALUES (b, 'analysis', '{}', '{}');
        RAISE EXCEPTION 'A was able to insert a run for B';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    -- B sees nothing of A's, cannot delete it
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO n FROM public.runs;
    IF n <> 0 THEN RAISE EXCEPTION 'B can see % run(s) of A', n; END IF;
    DELETE FROM public.runs WHERE id = rid;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'B deleted A''s run'; END IF;

    -- nobody can edit a saved run, and nobody can write profiles
    BEGIN
        UPDATE public.runs SET title = 'x';
        RAISE EXCEPTION 'UPDATE on runs should be refused';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        UPDATE public.profiles SET role = 'admin';
        RAISE EXCEPTION 'UPDATE on profiles should be refused';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        INSERT INTO public.profiles (user_id, role) VALUES (b, 'admin') ON CONFLICT DO NOTHING;
        RAISE EXCEPTION 'INSERT on profiles should be refused';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    -- a user reads only their own profile
    SELECT count(*) INTO n FROM public.profiles;
    IF n <> 1 THEN RAISE EXCEPTION 'B should see exactly one profile, saw %', n; END IF;

    -- the owner can delete their own run
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    DELETE FROM public.runs WHERE id = rid;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'A could not delete their own run'; END IF;

    -- anonymous visitors get nothing
    RESET ROLE;
    SET LOCAL ROLE anon;
    BEGIN
        PERFORM count(*) FROM public.runs;
        RAISE EXCEPTION 'anon could read runs';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    RAISE NOTICE 'RLS checks passed';
END $$;
