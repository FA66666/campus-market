import { Router } from "express";
import {
  getProfile,
  updateProfile,
  cancelAccount,
  getUserCredit,
} from "../controllers/userController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// GET /api/users/profile - 获取个人资料
router.get("/profile", authenticateToken, getProfile);

// PUT /api/users/profile - 更新个人资料
router.put("/profile", authenticateToken, updateProfile);

// POST /api/users/cancel - 注销账号
router.post("/cancel", authenticateToken, cancelAccount);

// GET /api/users/:id/credit - 获取用户公开信誉信息（公开接口）
router.get("/:id/credit", getUserCredit);

export default router;
