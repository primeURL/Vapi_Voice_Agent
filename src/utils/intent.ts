import { CallIntent } from "../types";

const emergencyKeywords = ["burst pipe", "gas leak", "flooding", "no heat"];

export function isEmergencyByKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return emergencyKeywords.some((kw) => lower.includes(kw));
}

export function detectIntent(text: string): CallIntent {
  const lower = text.toLowerCase();

  if (isEmergencyByKeywords(lower)) {
    return "emergency";
  }
  if (/(how much|price|cost|pricing|quote)/i.test(lower)) {
    return "pricing_question";
  }
  if (/(serve|service area|in aurora|in denver|in lakewood)/i.test(lower)) {
    return "service_area_question";
  }
  if (/(book|appointment|schedule|come tomorrow|come today|repair)/i.test(lower)) {
    return "booking_request";
  }

  return "unknown";
}
