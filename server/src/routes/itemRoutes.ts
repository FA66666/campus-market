// server/src/routes/itemRoutes.ts
import { Router } from "express";
// 引入新方法 toggleCollect, incrementView
import {
  getMarketItems,
  createItem,
  toggleCollect,
  incrementView,
} from "../controllers/itemController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// ... 原有路由 ...
router.get("/", getMarketItems);
router.post("/", authenticateToken, createItem);

// 新增互动路由
router.post("/:id/collect", authenticateToken, toggleCollect); // 收藏需要登录
router.post("/:id/view", incrementView); // 增加浏览量 (公开接口，不强制登录，当然也可以强制)

export default router;
