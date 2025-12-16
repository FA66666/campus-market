import { Router, Request } from "express"; // 引入 Request
import multer, { FileFilterCallback } from "multer"; // 引入 multer 类型
import path from "path";
import fs from "fs";
import {
  createOrder,
  getMyOrders,
  cancelOrder,
  getMySales,
  payOrder,
  shipOrder,
  confirmReceipt,
} from "../controllers/orderController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// --- Multer 上传配置 ---
const uploadDir = "uploads/payment_proofs";

// 确保上传目录存在
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置存储策略
const storage = multer.diskStorage({
  // 显式声明参数类型
  destination: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) {
    cb(null, uploadDir);
  },
  filename: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) {
    // 生成唯一文件名: 时间戳-随机数.扩展名
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// 初始化 multer
const upload = multer({ storage: storage });

// --- 路由定义 ---

// 卖家接口
router.get("/sales", authenticateToken, getMySales);

// 订单操作接口
router.post("/create", authenticateToken, createOrder);

// 获取我的订单
router.get("/my", authenticateToken, getMyOrders);

// 取消订单
router.post("/:id/cancel", authenticateToken, cancelOrder);

// 支付接口添加 upload.single('payment_proof') 中间件
router.post(
  "/:id/pay",
  authenticateToken,
  upload.single("payment_proof"),
  payOrder
);

// 发货
router.post("/:id/ship", authenticateToken, shipOrder);

// 确认收货
router.post("/:id/receipt", authenticateToken, confirmReceipt);

export default router;
