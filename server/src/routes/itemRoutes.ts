import { Router } from "express";
import {
  getMarketItems,
  createItem,
  toggleCollect,
  incrementView,
} from "../controllers/itemController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// GET /api/items/market - 获取商品广场列表
router.get("/market", getMarketItems);

// POST /api/items - 发布商品
router.post("/", authenticateToken, createItem);

// 新增互动路由
router.post("/:id/collect", authenticateToken, toggleCollect);
router.post("/:id/view", incrementView);

export default router;
