// 文件路径: server/src/routes/cartRoutes.ts
import { Router } from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  batchRemoveFromCart,
} from "../controllers/cartController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// 所有购物车接口都需要登录
router.use(authenticateToken);

// 获取购物车
router.get("/", getCart);

// 添加商品到购物车
router.post("/", addToCart);

// 更新购物车商品数量
router.put("/:itemId", updateCartItem);

// 移除购物车商品
router.delete("/:itemId", removeFromCart);

// 清空购物车
router.delete("/", clearCart);

// 批量删除购物车商品
router.post("/batch/remove", batchRemoveFromCart);

export default router;
