-- ============================================================
-- Migration 003: Technician signature, photos, serial reset
-- ============================================================

-- Add technician signature columns
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS technician_signature TEXT,
  ADD COLUMN IF NOT EXISTS technician_signed_at TIMESTAMPTZ;

-- Add photos column (array of public URLs from Supabase Storage)
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Reset serial_no sequence so the next certificate is #25
-- (Run this only once; adjust the value if your current max is different)
SELECT setval(pg_get_serial_sequence('certificates', 'serial_no'), 24, true);
