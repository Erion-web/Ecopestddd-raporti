-- ============================================================
-- EcoPest DDD - Database Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TECHNICIANS (managed by Supabase Auth + this table)
-- ============================================================
CREATE TABLE IF NOT EXISTS technicians (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'technician' CHECK (role IN ('admin', 'technician')),
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CERTIFICATES
-- ============================================================
CREATE TABLE IF NOT EXISTS certificates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serial_no       BIGSERIAL UNIQUE,         -- auto increment 1, 2, 3...
  request_no      TEXT DEFAULT '3126',
  reference_no    TEXT DEFAULT '04.5-429/25',

  -- Technician
  technician_id   UUID REFERENCES technicians(id),
  technician_name TEXT,

  -- Client info
  client_name     TEXT NOT NULL,
  client_branch   TEXT,
  client_address  TEXT,
  client_phone    TEXT,
  client_email    TEXT,

  -- Service date/time
  service_date    DATE NOT NULL,
  service_time    TIME,

  -- Service types
  service_types   TEXT[] DEFAULT '{}',    -- ['Dezinfektim','Dezinsektim','Deratizim']
  pest_types      TEXT[] DEFAULT '{}',    -- ['Milingonat','Marimangat',...]

  -- Products used
  products        JSONB DEFAULT '[]',     -- [{emri, doza}]

  -- Zones treated
  zones_green     TEXT[] DEFAULT '{}',
  zones_yellow    TEXT[] DEFAULT '{}',
  zones_red       TEXT[] DEFAULT '{}',

  -- Sanitary report
  sanitary_report JSONB DEFAULT '{}',     -- {"Kontejnerët...": "po", ...}

  -- Notes
  notes           TEXT,

  -- Status workflow
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','signed','archived')),

  -- Client signature (base64)
  client_signature TEXT,
  signed_at        TIMESTAMPTZ,

  -- PDF storage path
  pdf_path        TEXT,

  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Technicians: each user sees own profile; admins see all
CREATE POLICY "Technicians can view own profile"
  ON technicians FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all technicians"
  ON technicians FOR ALL
  USING (
    EXISTS (SELECT 1 FROM technicians t WHERE t.id = auth.uid() AND t.role = 'admin')
  );

-- Certificates: technicians see own; admins see all
CREATE POLICY "Technicians can manage own certificates"
  ON certificates FOR ALL
  USING (technician_id = auth.uid());

CREATE POLICY "Admins can manage all certificates"
  ON certificates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM technicians t WHERE t.id = auth.uid() AND t.role = 'admin')
  );

-- Public read for signed certificates (for client PDF link)
CREATE POLICY "Public can view signed certificates"
  ON certificates FOR SELECT
  USING (status IN ('sent', 'signed'));

-- ============================================================
-- STORAGE BUCKET for PDFs
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'certificates' AND auth.role() = 'authenticated');

CREATE POLICY "PDFs are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificates');

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_certificates_technician ON certificates(technician_id);
CREATE INDEX idx_certificates_status ON certificates(status);
CREATE INDEX idx_certificates_date ON certificates(service_date DESC);
CREATE INDEX idx_certificates_client ON certificates(client_name);

-- ============================================================
-- SAMPLE ADMIN USER (run after creating user in Auth)
-- Replace 'YOUR-USER-UUID' with actual UUID from auth.users
-- ============================================================
-- INSERT INTO technicians (id, full_name, email, role)
-- VALUES ('YOUR-USER-UUID', 'Admin EcoPest', 'admin@ecopest-ddd.com', 'admin');
