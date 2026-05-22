DROP TABLE IF EXISTS call_analysis;

CREATE TABLE IF NOT EXISTS call_logs (
  id BIGSERIAL PRIMARY KEY,
  call_id TEXT NOT NULL UNIQUE,
  caller_phone TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  ended_reason TEXT,
  duration_seconds NUMERIC(12, 3),
  recording_url TEXT,
  intent TEXT NOT NULL CHECK (
    intent IN (
      'booking_request',
      'emergency',
      'pricing_question',
      'service_area_question',
      'unknown'
    )
  ),
  service_needed TEXT,
  customer_name TEXT,
  address_or_city TEXT,
  preferred_time TEXT,
  is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
  sms_delivered BOOLEAN,
  summary TEXT,
  transcript TEXT,
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_intent ON call_logs (intent);
CREATE INDEX IF NOT EXISTS idx_call_logs_is_emergency ON call_logs (is_emergency);
CREATE INDEX IF NOT EXISTS idx_call_logs_raw_payload_gin ON call_logs USING GIN (raw_payload);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_call_logs_updated_at ON call_logs;
CREATE TRIGGER trg_call_logs_updated_at
BEFORE UPDATE ON call_logs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
