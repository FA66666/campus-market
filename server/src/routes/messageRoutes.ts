import { Router } from "express";
import {
  sendMessage,
  getConversations,
  getHistory,
  deleteConversation, // ✅ 引入新方法
} from "../controllers/messageController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

router.post("/send", authenticateToken, sendMessage);
router.get("/contacts", authenticateToken, getConversations);
router.get("/history", authenticateToken, getHistory);

// ✅ 新增：删除会话路由
router.delete(
  "/conversations/:targetId",
  authenticateToken,
  deleteConversation
);

export default router;
