import { Router } from "express";
import {
  createReview,
  getItemReviews,
  getUserReviews,
  getOrderReviews,
} from "../controllers/reviewController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// POST /api/reviews - 提交评价
router.post("/", authenticateToken, createReview);

// GET /api/reviews/items/:itemId - 获取商品的所有评价
router.get("/items/:itemId", getItemReviews);

// GET /api/reviews/users/:userId - 获取用户收到的评价
router.get("/users/:userId", getUserReviews);

// GET /api/reviews/orders/:orderId - 获取订单的评价详情
router.get("/orders/:orderId", authenticateToken, getOrderReviews);

export default router;
