import { Router } from "express";
import {
  getProfile,
  updateProfile,
  cancelAccount,
} from "../controllers/userController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// GET /api/users/profile - 获取个人资料
router.get("/profile", authenticateToken, getProfile);

// PUT /api/users/profile - 更新个人资料
router.put("/profile", authenticateToken, updateProfile);

// POST /api/users/cancel - 注销账号
router.post("/cancel", authenticateToken, cancelAccount);

export default router;
