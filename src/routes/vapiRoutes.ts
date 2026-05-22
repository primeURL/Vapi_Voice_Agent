import { Router } from "express";

import { handleCallEnded, handleListCalls } from "../controllers/callController";

const router = Router();

router.get("/call-list", handleListCalls);
router.post("/call-ended", handleCallEnded);

export default router;
