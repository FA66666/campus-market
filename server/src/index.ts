import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path"; // ✅ 新增引入 path
import authRoutes from "./routes/authRoutes";
import itemRoutes from "./routes/itemRoutes";
import userRoutes from "./routes/userRoutes";
import orderRoutes from "./routes/orderRoutes";
import messageRoutes from "./routes/messageRoutes";
import statRoutes from "./routes/statRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import adminRoutes from "./routes/adminRoutes";
import complaintRoutes from "./routes/complaintRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// ✅ 新增：静态资源托管
// 允许前端通过 /uploads/xxx 路径访问 server/uploads 目录下的文件
// 假设 server 目录结构为:
// server/
//   src/index.ts
//   uploads/
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 路由注册
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/stats", statRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/complaints", complaintRoutes);

// 全局错误处理 (防止崩溃)
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
