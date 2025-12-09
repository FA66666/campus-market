import { Router } from "express";
import { createReview } from "../controllers/reviewController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// POST /api/reviews
router.post("/", authenticateToken, createReview);

export default router;
