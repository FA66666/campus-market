import { Router } from "express";
import {
  getPendingItems,
  auditItem,
  getUsers,
  manageUser,
  getComplaints,
  resolveComplaint,
} from "../controllers/adminController";
import { adminLogin } from "../controllers/adminAuthController";
import { authenticateAdmin, requireRole } from "../middlewares/auth";

const router = Router();

// --- 角色常量定义 (与数据库 sys_role 表保持一致) ---
const ROLE_SUPER = "SUPER_ADMIN"; // 超级管理员
const ROLE_AUDITOR = "AUDITOR"; // 审核员

// 1. 管理员登录 (公开)
router.post("/login", adminLogin);

// 2. 商品审核模块 (允许: 审核员, 超级管理员)
router.get(
  "/items/pending",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  getPendingItems
);
router.post(
  "/items/:id/audit",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  auditItem
);

// 3. 用户管理模块 (仅允许: 超级管理员)
router.get("/users", authenticateAdmin, requireRole(ROLE_SUPER), getUsers);
router.post(
  "/users/:id/manage",
  authenticateAdmin,
  requireRole(ROLE_SUPER),
  manageUser
);

// 4. 投诉处理模块 (允许: 审核员, 超级管理员)
router.get(
  "/complaints",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  getComplaints
);
router.post(
  "/complaints/:id/resolve",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  resolveComplaint
);

export default router;
