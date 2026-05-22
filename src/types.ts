export type CallIntent =
  | "booking_request"
  | "emergency"
  | "pricing_question"
  | "service_area_question"
  | "unknown";

export interface NormalizedCallRecord {
  callId: string;
  callerPhone: string | null;
  startedAt: string | null;
  endedAt: string | null;
  endedReason: string | null;
  durationSeconds: number | null;
  recordingUrl: string | null;
  intent: CallIntent;
  serviceNeeded: string | null;
  customerName: string | null;
  addressOrCity: string | null;
  preferredTime: string | null;
  isEmergency: boolean;
  smsDelivered: boolean | null;
  summary: string | null;
  transcript: string | null;
}

export interface VapiCallEndedPayload {
  callId?: string;
  startedAt?: string;
  endedAt?: string;
  endedReason?: string;
  durationSeconds?: number;
  durationMs?: number;
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  logUrl?: string;
  phoneNumber?: {
    number?: string;
  };
  customer?: {
    number?: string;
    phone?: string;
    name?: string;
  };
  analysis?: {
    summary?: string;
    transcript?: string;
    structuredData?: Record<string, unknown>;
    successEvaluation?: boolean | string;
    messages?: unknown[];
    messagesOpenAIFormatted?: unknown[];
    performanceMetrics?: Record<string, unknown>;
    costBreakdown?: Record<string, unknown>;
    costs?: unknown[];
  };
  artifact?: {
    transcript?: string;
    messages?: unknown[];
    messagesOpenAIFormatted?: unknown[];
    structuredOutputs?: Record<string, {
      result?: Record<string, unknown>;
    }>;
  };
  call?: {
    id?: string;
    type?: string;
    createdAt?: string;
    updatedAt?: string;
    customer?: {
      number?: string;
    };
  };
  assistant?: {
    id?: string;
    name?: string;
  };
  transcript?: string;
  summary?: string;
  messages?: unknown[];
  messagesOpenAIFormatted?: unknown[];
  performanceMetrics?: Record<string, unknown>;
  costBreakdown?: Record<string, unknown>;
  costs?: unknown[];
  [key: string]: unknown;
}

export interface ListCallsQuery {
  limit?: number;
  cursor?: string;
}

export interface VapiCallListPagination {
  limit: number;
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean | null;
  total: number | null;
}

export interface VapiCallListResponse {
  items: unknown[];
  pagination: VapiCallListPagination;
  raw: unknown;
}
