import fs from "fs";
import path from "path";
import { saveCallEndedPayload } from "./services/callService";
import { initializeDatabase, db } from "./db";

async function run() {
  try {
    console.log("Initializing database schema...");
    await initializeDatabase();

    const samplePath = path.join(__dirname, "../../sample.json");
    if (!fs.existsSync(samplePath)) {
      console.error("Could not find sample.json at:", samplePath);
      process.exit(1);
    }

    console.log("Reading sample.json...");
    const rawData = fs.readFileSync(samplePath, "utf-8");
    const payload = JSON.parse(rawData);

    console.log("Saving mock call log to PostgreSQL...");
    const normalized = await saveCallEndedPayload(payload);
    console.log("Successfully normalized and saved mock log!");
    console.log("Call ID:", normalized.callId);
    console.log("Intent:", normalized.intent);
    console.log("Customer:", normalized.customerName);
  } catch (error) {
    console.error("Error inserting mock call:", error);
  } finally {
    await db.end();
  }
}

void run();
