-- Resolve linter warning: RLS enabled with no policy on code_sequences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'code_sequences' AND policyname = 'code_sequences_admin_read'
  ) THEN
    CREATE POLICY code_sequences_admin_read
      ON public.code_sequences
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;