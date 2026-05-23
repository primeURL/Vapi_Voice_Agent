import { Pool } from "pg";

import { config } from "./config";

export const db = new Pool({
  connectionString: config.databaseUrl,
  ssl: {
    rejectUnauthorized: true,
  },
});

let schemaBootstrapPromise: Promise<void> | null = null;

export async function initializeDatabase(): Promise<void> {
  if (!schemaBootstrapPromise) {
    schemaBootstrapPromise = db.query(`
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

      DROP TABLE IF EXISTS call_analysis;

      ALTER TABLE call_logs DROP COLUMN IF EXISTS assistant_id;
      ALTER TABLE call_logs DROP COLUMN IF EXISTS assistant_name;
      ALTER TABLE call_logs DROP COLUMN IF EXISTS call_type;
      ALTER TABLE call_logs DROP COLUMN IF EXISTS stereo_recording_url;
      ALTER TABLE call_logs DROP COLUMN IF EXISTS log_url;

      ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
      ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
      ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS ended_reason TEXT;
      ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC(12, 3);
      ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_url TEXT;
      ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS sms_delivered BOOLEAN;

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

    `).then(() => undefined);
  }

  await schemaBootstrapPromise;
}

export async function insertCallLog(params: {
  callId: string;
  callerPhone: string | null;
  startedAt: string | null;
  endedAt: string | null;
  endedReason: string | null;
  durationSeconds: number | null;
  recordingUrl: string | null;
  intent: string;
  serviceNeeded: string | null;
  customerName: string | null;
  addressOrCity: string | null;
  preferredTime: string | null;
  isEmergency: boolean;
  smsDelivered: boolean | null;
  summary: string | null;
  transcript: string | null;
  rawPayload: unknown;
}): Promise<void> {
  await db.query(
    `
    INSERT INTO call_logs (
      call_id,
      caller_phone,
      started_at,
      ended_at,
      ended_reason,
      duration_seconds,
      recording_url,
      intent,
      service_needed,
      customer_name,
      address_or_city,
      preferred_time,
      is_emergency,
      sms_delivered,
      summary,
      transcript,
      raw_payload
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
    )
    ON CONFLICT (call_id)
    DO UPDATE SET
      caller_phone = EXCLUDED.caller_phone,
      started_at = EXCLUDED.started_at,
      ended_at = EXCLUDED.ended_at,
      ended_reason = EXCLUDED.ended_reason,
      duration_seconds = EXCLUDED.duration_seconds,
      recording_url = EXCLUDED.recording_url,
      intent = EXCLUDED.intent,
      service_needed = EXCLUDED.service_needed,
      customer_name = EXCLUDED.customer_name,
      address_or_city = EXCLUDED.address_or_city,
      preferred_time = EXCLUDED.preferred_time,
      is_emergency = EXCLUDED.is_emergency,
      sms_delivered = EXCLUDED.sms_delivered,
      summary = EXCLUDED.summary,
      transcript = EXCLUDED.transcript,
      raw_payload = EXCLUDED.raw_payload,
      updated_at = NOW()
    `,
    [
      params.callId,
      params.callerPhone,
      params.startedAt,
      params.endedAt,
      params.endedReason,
      params.durationSeconds,
      params.recordingUrl,
      params.intent,
      params.serviceNeeded,
      params.customerName,
      params.addressOrCity,
      params.preferredTime,
      params.isEmergency,
      params.smsDelivered,
      params.summary,
      params.transcript,
      JSON.stringify(params.rawPayload),
    ],
  );
}

export async function getSmsDeliveryStatus(callId: string): Promise<boolean | null> {
  const result = await db.query(
    `
    SELECT sms_delivered
    FROM call_logs
    WHERE call_id = $1
    `,
    [callId],
  );

  return result.rows[0]?.sms_delivered ?? null;
}

export async function updateCallLogSmsStatus(params: {
  callId: string;
  smsDelivered: boolean;
}): Promise<void> {
  await db.query(
    `
    UPDATE call_logs
    SET sms_delivered = $2,
        updated_at = NOW()
    WHERE call_id = $1
    `,
    [params.callId, params.smsDelivered],
  );
}

export interface CallStats {
  totalCalls: number;
  emergencyCalls: number;
  bookingCalls: number;
  avgDuration: number;
}

export async function getCallStats(): Promise<CallStats> {
  const result = await db.query(`
    SELECT 
      COUNT(*)::INTEGER as total_calls,
      COUNT(CASE WHEN is_emergency = TRUE THEN 1 END)::INTEGER as emergency_calls,
      COUNT(CASE WHEN intent = 'booking_request' THEN 1 END)::INTEGER as booking_calls,
      ROUND(COALESCE(AVG(duration_seconds), 0), 1)::NUMERIC as avg_duration
    FROM call_logs
  `);
  
  const row = result.rows[0];
  return {
    totalCalls: row.total_calls ?? 0,
    emergencyCalls: row.emergency_calls ?? 0,
    bookingCalls: row.booking_calls ?? 0,
    avgDuration: Number(row.avg_duration ?? 0),
  };
}

export async function getPaginatedCallLogs(params: {
  limit: number;
  offset: number;
}): Promise<{
  items: any[];
  total: number;
}> {
  const countResult = await db.query(`SELECT COUNT(*)::INTEGER as total FROM call_logs`);
  const total = countResult.rows[0]?.total ?? 0;

  const result = await db.query(
    `
    SELECT 
      id,
      call_id as "callId",
      caller_phone as "callerPhone",
      started_at as "startedAt",
      ended_at as "endedAt",
      ended_reason as "endedReason",
      duration_seconds as "durationSeconds",
      recording_url as "recordingUrl",
      intent,
      service_needed as "serviceNeeded",
      customer_name as "customerName",
      address_or_city as "addressOrCity",
      preferred_time as "preferredTime",
      is_emergency as "isEmergency",
      sms_delivered as "smsDelivered",
      summary,
      transcript,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM call_logs
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
    `,
    [params.limit, params.offset]
  );

  return {
    items: result.rows,
    total,
  };
}

