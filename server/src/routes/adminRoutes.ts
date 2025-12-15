import { Router } from "express";
import {
  getPendingItems,
  auditItem,
  getUsers,
  manageUser,
  getComplaints,
  resolveComplaint,
} from "../controllers/adminController";
import { authenticateToken } from "../middlewares/auth";

// 注意：实际项目中建议增加 isAdmin 中间件校验管理员权限
const router = Router();

// --- 商品审核 ---
router.get("/items/pending", authenticateToken, getPendingItems);
router.post("/items/:id/audit", authenticateToken, auditItem);

// --- 用户管理 (新增) ---
router.get("/users", authenticateToken, getUsers);
router.post("/users/:id/manage", authenticateToken, manageUser); // 封禁/解封

// --- 投诉处理 (新增) ---
router.get("/complaints", authenticateToken, getComplaints);
router.post("/complaints/:id/resolve", authenticateToken, resolveComplaint);

export default router;
