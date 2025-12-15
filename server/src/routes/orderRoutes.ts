import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  cancelOrder,
  getMySales,
  payOrder,
  shipOrder,
  confirmReceipt,
} from "../controllers/orderController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// --- 卖家接口 ---
router.get("/sales", authenticateToken, getMySales);

// --- 订单操作接口 ---
router.post("/", authenticateToken, createOrder);

// GET /api/orders/my - 获取我的订单
router.get("/my", authenticateToken, getMyOrders);

router.post("/:id/cancel", authenticateToken, cancelOrder);
router.post("/:id/pay", authenticateToken, payOrder);
router.post("/:id/ship", authenticateToken, shipOrder);

// 修正：前端请求的是 /receipt，此处需保持一致
router.post("/:id/receipt", authenticateToken, confirmReceipt);

export default router;
