import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: requireEnv("DATABASE_URL"),
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? null,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? null,
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? null,
  twilioMessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID ?? null,
  alertToNumber: process.env.ALERT_TO_NUMBER ?? null,
  vapiApiKey: requireEnv("VAPI_API_KEY"),
  vapiBaseUrl: process.env.VAPI_BASE_URL ?? "https://api.vapi.ai",
};
