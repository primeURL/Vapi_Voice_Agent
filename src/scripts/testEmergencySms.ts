import { sendEmergencyAlert } from "../services/emergencyAlertService";

async function main(): Promise<void> {
  const sampleData = {
    callerPhone: "+15555555555",
    serviceNeeded: "burst pipe and flooding",
    addressOrCity: "Denver",
    customerName: "Test Caller",
    callId: "test_call_001",
  };

  console.log("Sending emergency SMS test with sample data...");
  console.log(JSON.stringify(sampleData, null, 2));
  await sendEmergencyAlert(sampleData);
  console.log("Emergency SMS test finished.");
}

void main().catch((error) => {
  console.error("Emergency SMS test failed:", error);
  process.exitCode = 1;
});
