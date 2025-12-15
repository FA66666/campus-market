import { Router } from "express";
import {
  submitComplaint,
  getMyComplaints,
} from "../controllers/complaintController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// POST /api/complaints/submit - 提交投诉
router.post("/submit", authenticateToken, submitComplaint);

// GET /api/complaints/my - 获取我的投诉记录
router.get("/my", authenticateToken, getMyComplaints);

export default router;
