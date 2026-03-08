-- Add next_service_date column (auto-calculated as service_date + 5 months)
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS next_service_date DATE 
GENERATED ALWAYS AS (service_date + INTERVAL '5 months') STORED;

-- Index for fast reminder queries
CREATE INDEX IF NOT EXISTS idx_certificates_next_service ON certificates(next_service_date);
