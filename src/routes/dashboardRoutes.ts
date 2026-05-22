import { Router } from "express";
import { renderDashboard, getPaginatedCalls } from "../controllers/dashboardController";

const router = Router();

router.get("/", renderDashboard);
router.get("/dashboard", renderDashboard);
router.get("/api/calls", getPaginatedCalls);

export default router;
