import { Router } from "express";
import {
  sendMessage,
  getConversations,
  getHistory,
} from "../controllers/messageController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

router.post("/", authenticateToken, sendMessage); // 发送
router.get("/conversations", authenticateToken, getConversations); // 会话列表
router.get("/history/:userId", authenticateToken, getHistory); // 具体聊天记录

export default router;
