-- Migration: add failed login tracking columns to public.profiles
-- Adds columns for brute‑force protection

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_failed_at timestamp with time zone;
