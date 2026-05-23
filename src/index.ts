import path from "path";
import express, { Request, Response } from "express";

import { config } from "./config";
import { db, initializeDatabase } from "./db";
import vapiRoutes from "./routes/vapiRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";

const app = express();
let server: ReturnType<typeof app.listen> | null = null;
let isShuttingDown = false;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use(express.json({ limit: "2mb" }));

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await db.query("SELECT 1");
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Health check failed", error);
    res.status(503).json({ ok: false });
  }
});

app.use("/vapi", vapiRoutes);
app.use("/", dashboardRoutes);

async function startServer(): Promise<void> {
  await initializeDatabase();

  server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });

  server.on("error", (error) => {
    console.error("Server error during startup", error);
    process.exit(1);
  });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Received ${signal}. Shutting down gracefully...`);

  try {
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        resolve();
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  } catch (error) {
    console.error("Error while closing HTTP server", error);
  }

  try {
    await db.end();
  } catch (error) {
    console.error("Error while closing database pool", error);
  }

  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

void startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

