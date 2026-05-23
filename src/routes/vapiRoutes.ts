import { Router } from "express";

import { handleCallEnded } from "../controllers/callController";

const router = Router();

router.post("/call-ended", handleCallEnded);

export default router;
