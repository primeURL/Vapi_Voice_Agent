import path from "path";
import express, { Request, Response } from "express";

import { config } from "./config";
import { db, initializeDatabase } from "./db";
import vapiRoutes from "./routes/vapiRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";

const app = express();

// Configure views engine and directory
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use(express.json({ limit: "2mb" }));

app.get("/health", async (_req: Request, res: Response) => {
  await db.query("SELECT 1");
  res.status(200).json({ ok: true });
});

app.use("/vapi", vapiRoutes);
app.use("/", dashboardRoutes);

async function startServer(): Promise<void> {
  await initializeDatabase();

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

void startServer();

