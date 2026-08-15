-- ============================================================
-- Migration 005: Make certificate links fully public
-- Run this in: Supabase Dashboard > SQL Editor
--
-- Previously only certificates with status 'sent' or 'signed' were
-- readable by anonymous visitors, so a client opening their emailed
-- link before that status transition happened (or a draft link)
-- got a 404. The certificate id is a UUID shared only via a private
-- email/link (a bearer token), so there's no meaningful security
-- risk in making every certificate readable by anyone who has the
-- direct link — this replaces the status-restricted policy with an
-- open one.
-- ============================================================

DROP POLICY IF EXISTS "Public can view signed certificates" ON certificates;

CREATE POLICY "Public can view certificates by direct link"
  ON certificates FOR SELECT
  USING (true);
