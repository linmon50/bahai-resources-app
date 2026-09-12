-- Add lockout tracking columns to the memberships table
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_failed_at TIMESTAMPTZ;
