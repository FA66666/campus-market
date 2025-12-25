import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/authRoutes";
import itemRoutes from "./routes/itemRoutes";
import userRoutes from "./routes/userRoutes";
import orderRoutes from "./routes/orderRoutes";
import messageRoutes from "./routes/messageRoutes";
import statRoutes from "./routes/statRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import adminRoutes from "./routes/adminRoutes";
import complaintRoutes from "./routes/complaintRoutes";
// ✅ [新增] 引入分类路由
import categoryRoutes from "./routes/categoryRoutes";
// ✅ [新增] 引入地址路由
import addressRoutes from "./routes/addressRoutes";
// ✅ [新增] 引入购物车路由
import cartRoutes from "./routes/cartRoutes";
// 保留数据库检查，这是一个很好的实践
import { checkConnection } from "./config/db";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 静态资源托管
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

// ✅ [新增] 注册分类路由
app.use("/api/categories", categoryRoutes);

// ✅ [新增] 注册地址路由
app.use("/api/addresses", addressRoutes);

// ✅ [新增] 注册购物车路由
app.use("/api/cart", cartRoutes);

// 全局错误处理
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack); // 只打印错误堆栈
  res.status(500).send("Something broke!");
});

app.listen(PORT, async () => {
  console.log(`✅ Server is running on port ${PORT}`);
  await checkConnection(); // 启动时自动检查数据库连接
});
