import { Router } from "express";
import {
  getPlatformStats,
  getOrderTrend,
  getCategoryStats,
  getOrderStatusStats,
  getCreditScoreDistribution,
  getRecentActivity,
  getPendingStats,
} from "../controllers/statController";
import { authenticateAdmin, requireRole } from "../middlewares/auth";

const router = Router();

// 角色常量
const ROLE_SUPER = "SUPER_ADMIN";
const ROLE_AUDITOR = "AUDITOR";

// GET /api/stats - 平台基础统计（管理员权限）
router.get(
  "/",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  getPlatformStats
);

// 以下接口需要管理员权限

// GET /api/stats/order-trend - 订单趋势
router.get(
  "/order-trend",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  getOrderTrend
);

// GET /api/stats/category - 分类统计
router.get(
  "/category",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  getCategoryStats
);

// GET /api/stats/order-status - 订单状态分布
router.get(
  "/order-status",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  getOrderStatusStats
);

// GET /api/stats/credit-distribution - 信誉分分布
router.get(
  "/credit-distribution",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  getCreditScoreDistribution
);

// GET /api/stats/recent-activity - 近期活跃数据
router.get(
  "/recent-activity",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  getRecentActivity
);

// GET /api/stats/pending - 待处理事项统计
router.get(
  "/pending",
  authenticateAdmin,
  requireRole(ROLE_AUDITOR, ROLE_SUPER),
  getPendingStats
);

export default router;
