-- Migration: Dedicated table for account lockout tracking
CREATE TABLE IF NOT EXISTS public.login_attempts (
    email TEXT PRIMARY KEY,
    failed_login_attempts INT DEFAULT 0,
    last_failed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- 1. Get lockout status
CREATE OR REPLACE FUNCTION public.get_lockout_status(p_email TEXT)
RETURNS TABLE(failed_login_attempts INT, last_failed_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    COALESCE(la.failed_login_attempts, 0)::INT AS failed_login_attempts,
    la.last_failed_at AS last_failed_at
  FROM public.login_attempts la
  WHERE LOWER(la.email) = LOWER(p_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lockout_status(TEXT) TO anon, authenticated, service_role;

-- 2. Record failed login
CREATE OR REPLACE FUNCTION public.record_failed_login(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.login_attempts (email, failed_login_attempts, last_failed_at, updated_at)
  VALUES (LOWER(TRIM(p_email)), 1, now(), now())
  ON CONFLICT (email) DO UPDATE
  SET 
    failed_login_attempts = public.login_attempts.failed_login_attempts + 1,
    last_failed_at = now(),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_failed_login(TEXT) TO anon, authenticated, service_role;

-- 3. Record successful login / reset
CREATE OR REPLACE FUNCTION public.record_successful_login(p_email TEXT DEFAULT NULL, p_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_email TEXT := p_email;
BEGIN
  IF (target_email IS NULL OR TRIM(target_email) = '') AND p_user_id IS NOT NULL THEN
    SELECT email INTO target_email FROM auth.users WHERE id = p_user_id;
  END IF;

  IF target_email IS NOT NULL AND TRIM(target_email) <> '' THEN
    UPDATE public.login_attempts
    SET 
      failed_login_attempts = 0,
      last_failed_at = NULL,
      updated_at = now()
    WHERE LOWER(email) = LOWER(TRIM(target_email));
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_successful_login(TEXT, UUID) TO anon, authenticated, service_role;
