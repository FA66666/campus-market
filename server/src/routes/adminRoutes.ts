import { Router } from "express";
import {
  getPendingItems,
  auditItem,
  batchAuditItems, // ✅ 批量审核
  getUsers,
  manageUser,
  getComplaints,
  resolveComplaint,
  getPendingAuthUsers,
  verifyUser,
  // 评价管理
  getReviews,
  toggleReviewVisibility,
  // 订单管理
  getOrders,
  getOrderDetail,
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
// ✅ [新增] 批量审核商品
router.post(
  "/items/batch/audit",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  batchAuditItems
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

// 5. 用户认证审核模块 (允许: 审核员, 超级管理员)
router.get(
  "/users/pending-auth",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  getPendingAuthUsers
);
router.post(
  "/users/:id/verify",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  verifyUser
);

// 6. 评价管理模块 (允许: 审核员, 超级管理员)
router.get(
  "/reviews",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  getReviews
);
router.post(
  "/reviews/:id/toggle",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  toggleReviewVisibility
);

// 7. 订单管理模块 (允许: 审核员, 超级管理员)
router.get(
  "/orders",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  getOrders
);
router.get(
  "/orders/:id",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  getOrderDetail
);

export default router;
