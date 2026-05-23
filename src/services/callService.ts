import { getSmsDeliveryStatus, insertCallLog, updateCallLogSmsStatus } from "../db";
import { NormalizedCallRecord, VapiCallEndedPayload } from "../types";
import { sendEmergencyAlert } from "./emergencyAlertService";
import { detectIntent, isEmergencyByKeywords } from "../utils/intent";

const rawTimeoutMs = Number(process.env.OPERATION_TIMEOUT_MS);
const OPERATION_TIMEOUT_MS = Number.isFinite(rawTimeoutMs) && rawTimeoutMs > 0 ? rawTimeoutMs : 8000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function toText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function unwrapPayload(payload: VapiCallEndedPayload): VapiCallEndedPayload {
  const envelope = payload as Record<string, unknown>;
  const nestedMessage = envelope.message;

  if (nestedMessage && typeof nestedMessage === "object") {
    return nestedMessage as VapiCallEndedPayload;
  }

  return payload;
}

function resolveCallId(payload: VapiCallEndedPayload): string {
  const envelope = payload as Record<string, unknown>;
  const message = envelope.message as Record<string, unknown> | undefined;
  const messageCall = message?.call as Record<string, unknown> | undefined;

  const messageCallId = toText(message?.callId) ?? toText(messageCall?.id);
  if (messageCallId) {
    return messageCallId;
  }

  const source = unwrapPayload(payload);
  const callId =
    toText(source.callId) ??
    toText((source.call as Record<string, unknown> | undefined)?.id);

  return callId ?? `unknown_${Date.now()}`;
}

function extractStructuredOutputResult(source: VapiCallEndedPayload): Record<string, unknown> | null {
  const artifact = source.artifact as Record<string, unknown> | undefined;
  const structuredOutputs = artifact?.structuredOutputs as Record<string, unknown> | undefined;

  if (!structuredOutputs) {
    return null;
  }

  const firstOutput = Object.values(structuredOutputs)[0] as Record<string, unknown> | undefined;
  const result = firstOutput?.result;

  if (result && typeof result === "object") {
    return result as Record<string, unknown>;
  }

  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return null;
}

function toIntent(value: unknown): NormalizedCallRecord["intent"] | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "booking_request":
    case "emergency":
    case "pricing_question":
    case "service_area_question":
    case "unknown":
      return normalized;
    default:
      return null;
  }
}

export function normalizePayload(payload: VapiCallEndedPayload, resolvedCallId?: string): NormalizedCallRecord {
  const source = unwrapPayload(payload);
  const callId = resolvedCallId ?? resolveCallId(source);
  const structuredOutput = extractStructuredOutputResult(source);
  const structured = source.analysis?.structuredData ?? {};
  const call = source.call as Record<string, unknown> | undefined;
  const artifact = source.artifact as Record<string, unknown> | undefined;

  const summary =
    toText(source.analysis?.summary) ??
    toText(source.summary) ??
    toText((structured as Record<string, unknown>).summary);

  const transcript =
    toText(source.analysis?.transcript) ??
    toText(source.artifact?.transcript) ??
    toText(source.transcript) ??
    toText((structured as Record<string, unknown>).transcript);

  const combinedText = [summary, transcript].filter(Boolean).join(" ");

  const startedAt = toText((call as Record<string, unknown> | undefined)?.createdAt) ?? toText(source.startedAt);
  const endedAt = toText(source.endedAt);
  const endedReason = toText(source.endedReason);
  const durationSeconds =
    typeof source.durationSeconds === "number"
      ? source.durationSeconds
      : typeof source.durationMs === "number"
        ? Number(source.durationMs / 1000)
        : null;
  const recordingUrl = toText(source.recordingUrl) ?? toText(artifact?.recordingUrl);

  const structuredCallerPhone = toText(structuredOutput?.callerPhone) ??
    toText((structured as Record<string, unknown>).callerPhone);
  const callerPhone =
    structuredCallerPhone ??
    toText(source.call?.customer?.number) ??
    toText(source.customer?.number) ??
    toText(source.customer?.phone) ??
    toText(source.phoneNumber?.number);

  const structuredServiceNeeded = toText(structuredOutput?.serviceNeeded) ??
    toText((structured as Record<string, unknown>).serviceNeeded);
  const structuredCustomerName = toText(structuredOutput?.customerName) ??
    toText((structured as Record<string, unknown>).customerName);
  const structuredAddressOrCity = toText(structuredOutput?.addressOrCity) ??
    toText((structured as Record<string, unknown>).addressOrCity);
  const structuredPreferredTime = toText(structuredOutput?.preferredTime) ??
    toText((structured as Record<string, unknown>).preferredTime);

  const serviceNeeded = structuredServiceNeeded;
  const customerName = structuredCustomerName ?? toText(source.customer?.name);
  const addressOrCity = structuredAddressOrCity;
  const preferredTime = structuredPreferredTime;

  const structuredIntent = toIntent(structuredOutput?.intent) ??
    toIntent((structured as Record<string, unknown>).intent);
  const intentFromText = detectIntent(combinedText);
  const intent = structuredIntent ?? intentFromText;
  const structuredIsEmergency =
    toBoolean(structuredOutput?.isEmergency) ??
    toBoolean((structured as Record<string, unknown>).isEmergency);
  const isEmergency = structuredIsEmergency ?? (
    isEmergencyByKeywords(combinedText) ||
    intent === "emergency"
  );

  return {
    callId,
    callerPhone,
    startedAt,
    endedAt,
    endedReason,
    durationSeconds,
    recordingUrl,
    intent: isEmergency ? "emergency" : intent,
    serviceNeeded,
    customerName,
    addressOrCity,
    preferredTime,
    isEmergency,
    smsDelivered: null,
    summary,
    transcript,
  };
}

export async function saveCallEndedPayload(payload: VapiCallEndedPayload): Promise<NormalizedCallRecord> {
  const resolvedCallId = resolveCallId(payload);
  const normalized = normalizePayload(payload, resolvedCallId);

  await withTimeout(insertCallLog({
    callId: normalized.callId,
    callerPhone: normalized.callerPhone,
    startedAt: normalized.startedAt,
    endedAt: normalized.endedAt,
    endedReason: normalized.endedReason,
    durationSeconds: normalized.durationSeconds,
    recordingUrl: normalized.recordingUrl,
    intent: normalized.intent,
    serviceNeeded: normalized.serviceNeeded,
    customerName: normalized.customerName,
    addressOrCity: normalized.addressOrCity,
    preferredTime: normalized.preferredTime,
    isEmergency: normalized.isEmergency,
    smsDelivered: null,
    summary: normalized.summary,
    transcript: normalized.transcript,
    rawPayload: payload,
  }), OPERATION_TIMEOUT_MS, "Insert call log");

  let smsDelivered: boolean | null = null;
  if (normalized.isEmergency) {
    try {
      let existingSmsStatus: boolean | null = null;
      try {
        existingSmsStatus = await withTimeout(
          getSmsDeliveryStatus(normalized.callId),
          OPERATION_TIMEOUT_MS,
          "Read SMS delivery status",
        );
      } catch (error) {
        console.error("Failed to read SMS delivery status", error);
      }

      if (existingSmsStatus === true) {
        smsDelivered = true;
      } else {
        smsDelivered = await withTimeout(
          sendEmergencyAlert({
            callerPhone: normalized.callerPhone,
            serviceNeeded: normalized.serviceNeeded,
            addressOrCity: normalized.addressOrCity,
            customerName: normalized.customerName,
            callId: normalized.callId,
          }),
          OPERATION_TIMEOUT_MS,
          "Send emergency SMS",
        );

        await withTimeout(
          updateCallLogSmsStatus({
            callId: normalized.callId,
            smsDelivered,
          }),
          OPERATION_TIMEOUT_MS,
          "Update SMS delivery status",
        );
      }
    } catch (error) {
      smsDelivered = false;
      console.error("Emergency SMS alert failed:", error);

      try {
        await withTimeout(
          updateCallLogSmsStatus({
            callId: normalized.callId,
            smsDelivered,
          }),
          OPERATION_TIMEOUT_MS,
          "Update SMS delivery status after failure",
        );
      } catch (updateError) {
        console.error("Failed to update SMS delivery status", updateError);
      }
    }
  }

  normalized.smsDelivered = smsDelivered;

  return normalized;
}
