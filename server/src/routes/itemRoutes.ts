import { Router } from "express";
import {
  createItem,
  getMarketItems,
  toggleCollect,
  incrementView,
  getMyItems, // 新增导入
} from "../controllers/itemController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// 公开接口
router.get("/market", getMarketItems);
router.post("/:id/view", incrementView);

// 需要登录的接口
router.post("/", authenticateToken, createItem);
router.post("/:id/collect", authenticateToken, toggleCollect);

// 新增：获取我发布的商品
router.get("/my", authenticateToken, getMyItems);

export default router;
