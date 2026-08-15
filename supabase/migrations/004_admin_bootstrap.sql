-- ============================================================
-- Migration 004: Bootstrap the first admin account
-- Run this in: Supabase Dashboard > SQL Editor
--
-- Prerequisite: create the auth user first via
--   Supabase Dashboard > Authentication > Users > Add user
--   Email: admin@ecopest.com   (set any password there)
--
-- This version is defensive: it errors loudly (instead of silently
-- doing nothing) if the auth user doesn't exist yet, and it handles
-- the case where a stale `technicians` row already has this email
-- under a different id (e.g. from a deleted/recreated auth user).
-- ============================================================

DO $$
DECLARE
  target_id uuid;
BEGIN
  SELECT id INTO target_id FROM auth.users WHERE email = 'admin@ecopest.com';

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for admin@ecopest.com yet — create it in Authentication > Users first, then re-run this.';
  END IF;

  -- Drop a stale technicians row with this email under a different id,
  -- as long as nothing else references it.
  DELETE FROM technicians
  WHERE email = 'admin@ecopest.com'
    AND id <> target_id
    AND NOT EXISTS (SELECT 1 FROM certificates WHERE technician_id = technicians.id);

  INSERT INTO technicians (id, full_name, email, role, active)
  VALUES (target_id, 'Admin', 'admin@ecopest.com', 'admin', true)
  ON CONFLICT (id) DO UPDATE SET role = 'admin', active = true, email = 'admin@ecopest.com';
END $$;

-- Verify it worked:
SELECT id, full_name, email, role, active FROM technicians WHERE email = 'admin@ecopest.com';
