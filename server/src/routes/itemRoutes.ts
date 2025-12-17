// 文件路径: server/src/routes/itemRoutes.ts
import { Router, Request, Response, NextFunction } from "express";
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

// --- Multer 配置 ---
// 使用绝对路径，防止因运行目录不同导致找不到文件夹
const uploadDir = path.join(__dirname, "../../uploads/items");

// 🔍 [调试] 打印计算出的上传路径，请在控制台检查这个路径是否存在、是否正确
console.log("📂 [ItemRoutes] Upload Directory:", uploadDir);

if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("✅ [ItemRoutes] Created directory:", uploadDir);
  } catch (err) {
    console.error("❌ [ItemRoutes] Failed to create directory:", err);
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // ⚠️ 修改：暂时移除 Buffer 转码，防止因编码问题导致 500 且无日志
    // 如果需要解决中文乱码，建议后续确认环境支持后再加回来
    // const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // 使用简单的后缀名提取
    const ext = path.extname(file.originalname);
    cb(null, "item-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 限制
});

// --- 错误处理中间件 ---
const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log("⏳ [Upload] Starting file upload processing...");

  const uploadFunc = upload.array("images", 9); // 'images' 对应前端 formData 字段

  uploadFunc(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      console.error("❌ [Multer Error]:", err);
      return res.status(500).json({ message: `图片上传错误: ${err.message}` });
    } else if (err) {
      console.error("❌ [Unknown Upload Error]:", err);
      return res.status(500).json({ message: `上传未知错误: ${err.message}` });
    }

    // 🔍 [调试] 打印成功上传的文件数量
    const fileCount = (req.files as any)?.length || 0;
    console.log(`✅ [Upload] Success. Files received: ${fileCount}`);

    next();
  });
};

// 单图更新的中间件
const updateUploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const uploadFunc = upload.single("main_image");
  uploadFunc(req, res, (err: any) => {
    if (err) {
      console.error("Update Upload Error:", err);
      return res.status(500).json({ message: `更新图片失败: ${err.message}` });
    }
    next();
  });
};

// --- 路由 ---

router.get("/market", getMarketItems);
router.post("/:id/view", incrementView);

// ✅ 发布商品
router.post("/", authenticateToken, uploadMiddleware, createItem);

router.post("/:id/collect", authenticateToken, toggleCollect);
router.get("/my", authenticateToken, getMyItems);

// 更新商品
router.put("/:id", authenticateToken, updateUploadMiddleware, updateItem);

export default router;
