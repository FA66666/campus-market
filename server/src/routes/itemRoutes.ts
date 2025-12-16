// 文件路径: server/src/routes/itemRoutes.ts
import { Router, Request } from "express"; // 引入 Request
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  createItem,
  getMarketItems,
  toggleCollect,
  incrementView,
  getMyItems,
  updateItem,
} from "../controllers/itemController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// --- Multer 上传配置 (新增) ---
const uploadDir = "uploads/items"; // 商品图存这里

// 确保目录存在
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名: item-时间戳-随机数.扩展名
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "item-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// --- 路由定义 ---

// 公开接口
router.get("/market", getMarketItems);
router.post("/:id/view", incrementView);

// 需要登录的接口
router.post("/", authenticateToken, createItem);
router.post("/:id/collect", authenticateToken, toggleCollect);

// 获取我发布的商品
router.get("/my", authenticateToken, getMyItems);

// ✅ 修改：更新商品 (添加 upload.single 中间件)
// 注意：前端上传时的字段名必须是 "main_image"
router.put("/:id", authenticateToken, upload.single("main_image"), updateItem);

export default router;
