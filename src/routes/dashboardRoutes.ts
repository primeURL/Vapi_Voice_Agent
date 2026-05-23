import { Router } from "express";
import { getPaginatedCalls, renderDashboard } from "../controllers/dashboardController";

const router = Router();

router.get("/", renderDashboard);
router.get("/dashboard", renderDashboard);
router.get("/api/calls", getPaginatedCalls);

export default router;
