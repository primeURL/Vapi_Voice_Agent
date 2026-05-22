import { Request, Response } from "express";
import { getPaginatedCallLogs, getCallStats } from "../db";

function parsePositiveInt(value: unknown, defaultValue: number): number {
  if (typeof value === "undefined" || value === null) {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return defaultValue;
  }
  return parsed;
}

export async function renderDashboard(req: Request, res: Response): Promise<void> {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 10);
    const offset = (page - 1) * limit;

    const [logsResult, stats] = await Promise.all([
      getPaginatedCallLogs({ limit, offset }),
      getCallStats(),
    ]);

    const totalPages = Math.max(1, Math.ceil(logsResult.total / limit));

    res.render("dashboard", {
      logs: logsResult.items,
      totalCount: logsResult.total,
      stats,
      currentPage: page,
      totalPages,
      limit,
    });
  } catch (error) {
    console.error("Failed to render dashboard", error);
    res.status(500).send("An error occurred while loading the dashboard.");
  }
}

export async function getPaginatedCalls(req: Request, res: Response): Promise<void> {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 10);
    const offset = (page - 1) * limit;

    const [logsResult, stats] = await Promise.all([
      getPaginatedCallLogs({ limit, offset }),
      getCallStats(),
    ]);

    res.status(200).json({
      success: true,
      items: logsResult.items,
      total: logsResult.total,
      page,
      limit,
      stats,
    });
  } catch (error) {
    console.error("Failed to get call logs API", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch call logs",
    });
  }
}
