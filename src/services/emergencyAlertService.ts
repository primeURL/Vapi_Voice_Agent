import twilio from "twilio";

import { config } from "../config";

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient(): ReturnType<typeof twilio> | null {
  if (!config.twilioAccountSid || !config.twilioAuthToken) {
    return null;
  }

  if (!twilioClient) {
    twilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken);
  }

  return twilioClient;
}

export async function sendEmergencyAlert(data: {
  callerPhone: string | null;
  serviceNeeded: string | null;
  addressOrCity: string | null;
  customerName: string | null;
  callId: string;
}): Promise<boolean> {
  if (!config.alertToNumber) {
    console.warn("Emergency alert skipped: ALERT_TO_NUMBER missing");
    return false;
  }

  if (!config.twilioFromNumber && !config.twilioMessagingServiceSid) {
    console.warn("Emergency alert skipped: TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID missing");
    return false;
  }

  const client = getTwilioClient();
  if (!client) {
    console.warn("Emergency alert skipped: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing");
    return false;
  }

  const message = `🚨 EMERGENCY - ABC Home Services
Name: ${data.customerName || "Unknown"}
Phone: ${data.callerPhone || "Unknown"}
Issue: ${data.serviceNeeded || "Emergency"}
City: ${data.addressOrCity || "Unknown"}`;

  const sentMessage = await client.messages.create(
    config.twilioMessagingServiceSid
      ? {
          body: message,
          messagingServiceSid: config.twilioMessagingServiceSid,
          to: config.alertToNumber,
        }
      : {
          body: message,
          from: config.twilioFromNumber!,
          to: config.alertToNumber,
        },
  );

  console.log(
    "Emergency SMS create response:",
    JSON.stringify(
      {
        sid: sentMessage.sid,
        status: sentMessage.status,
        from: sentMessage.from,
        to: sentMessage.to,
        body: sentMessage.body,
        dateCreated: sentMessage.dateCreated,
        dateSent: sentMessage.dateSent,
        errorCode: sentMessage.errorCode,
        errorMessage: sentMessage.errorMessage,
      },
      null,
      2,
    ),
  );

  return true;
}
