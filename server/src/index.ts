// 文件路径: server/src/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { checkConnection } from "./config/db";
import authRoutes from "./routes/authRoutes";
import itemRoutes from "./routes/itemRoutes";
import orderRoutes from "./routes/orderRoutes"; // <--- 1. 新增引入
import userRoutes from "./routes/userRoutes";
import statRoutes from "./routes/statRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import adminRoutes from "./routes/adminRoutes";
import messageRoutes from "./routes/messageRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 挂载用户认证路由
app.use("/api/auth", authRoutes);

// 【修改2：挂载商品路由，路径前缀设为 /api/items】
app.use("/api/items", itemRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stats", statRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.send("University Second Hand Market API is running");
});

app.listen(PORT, async () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  await checkConnection();
});
