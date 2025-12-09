import { Router } from "express";
import { getPlatformStats } from "../controllers/statController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// GET /api/stats
router.get("/", authenticateToken, getPlatformStats);

export default router;
