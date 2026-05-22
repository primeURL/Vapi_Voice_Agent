import { Request, Response } from "express";

import { saveCallEndedPayload } from "../services/callService";
import { listVapiCalls } from "../services/vapiService";
import { ListCallsQuery, VapiCallEndedPayload } from "../types";

function parseLimit(value: unknown): number {
  if (typeof value === "undefined") {
    return 50;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error("limit must be an integer between 1 and 100");
  }

  return parsed;
}

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

export async function handleListCalls(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query as Record<string, unknown> & ListCallsQuery;
    const limit = parseLimit(query.limit);
    const cursor = typeof query.cursor === "string" && query.cursor.trim() ? query.cursor.trim() : undefined;

    const result = cursor ? await listVapiCalls({ limit, cursor }) : await listVapiCalls({ limit });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch calls";
    const statusCode = message.includes("limit must be") ? 400 : 500;

    console.error("Failed to process /vapi/calls", error);
    res.status(statusCode).json({
      success: false,
      message,
    });
  }
}
