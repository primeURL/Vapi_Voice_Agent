import { config } from "../config";
import { VapiCallListResponse } from "../types";

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function extractItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  const objectValue = asObject(raw);
  const candidates = [objectValue.calls, objectValue.items, objectValue.data, objectValue.results];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function toBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function listVapiCalls(params: {
  limit: number;
  cursor?: string;
}): Promise<VapiCallListResponse> {
  const url = new URL("/call", config.vapiBaseUrl);
  url.searchParams.set("limit", String(params.limit));

  if (params.cursor) {
    url.searchParams.set("cursor", params.cursor);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      authorization: `Bearer ${config.vapiApiKey}`,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vapi call list request failed with status ${response.status}: ${errorText}`);
  }

  const raw = (await response.json()) as unknown;
  const rawObject = asObject(raw);
  const paginationObject = asObject(rawObject.pagination);

  return {
    items: extractItems(raw),
    pagination: {
      limit: params.limit,
      cursor: params.cursor ?? null,
      nextCursor:
        toText(rawObject.nextCursor) ??
        toText(rawObject.cursor) ??
        toText(paginationObject.nextCursor) ??
        null,
      hasMore:
        toBoolean(rawObject.hasMore) ?? toBoolean(paginationObject.hasMore) ?? null,
      total:
        toNumber(rawObject.total) ?? toNumber(paginationObject.total) ?? null,
    },
    raw,
  };
}
