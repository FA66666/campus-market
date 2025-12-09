import { Router } from "express";
// 1. 务必确保这里引入了 getMySales, payOrder, shipOrder, confirmReceipt 等所有新方法
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

// --- 卖家接口 (必须放在 /:id 之前，防止被动态参数拦截) ---
router.get("/sales", authenticateToken, getMySales); // 卖家查看销售记录

// --- 订单操作接口 ---
router.post("/", authenticateToken, createOrder); // 创建订单
router.get("/", authenticateToken, getMyOrders); // 买家查看订单
router.post("/:id/cancel", authenticateToken, cancelOrder); // 取消订单
router.post("/:id/pay", authenticateToken, payOrder); // 支付
router.post("/:id/ship", authenticateToken, shipOrder); // 发货
router.post("/:id/receive", authenticateToken, confirmReceipt); // 收货

export default router;
