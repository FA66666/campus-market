import { Router } from "express";
import { getUserProfile } from "../controllers/userController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// GET /api/users/profile
router.get("/profile", authenticateToken, getUserProfile);

export default router;
