import { Request, Response } from "express";

import { saveCallEndedPayload } from "../services/callService";
import { VapiCallEndedPayload } from "../types";

function isEndOfCallReportPayload(payload: VapiCallEndedPayload): boolean {
  if ((payload as Record<string, unknown>).type === "end-of-call-report") {
    return true;
  }

  const envelope = payload as Record<string, unknown>;
  const message = envelope.message;

  if (!message || typeof message !== "object") {
    return false;
  }

  return (message as Record<string, unknown>).type === "end-of-call-report";
}

export async function handleCallEnded(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body as VapiCallEndedPayload;

    if (!isEndOfCallReportPayload(payload)) {
      res.status(200).json({
        success: true,
        skipped: true,
        message: "Ignored non-final Vapi webhook event",
      });
      return;
    }

    console.log("Processing call-ended webhook with payload:", JSON.stringify(payload));
    const normalized = await saveCallEndedPayload(payload);

    res.status(200).json({
      success: true,
      callId: normalized.callId,
      isEmergency: normalized.isEmergency,
    });
  } catch (error) {
    console.error("Failed to process /vapi/call-ended", error);
    res.status(500).json({
      success: false,
      message: "Failed to process call-ended webhook",
    });
  }
}
