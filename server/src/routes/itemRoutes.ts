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
  getItemDetail,
  batchUpdateItemStatus,
  getMyFavorites,
  checkFavorite,
} from "../controllers/itemController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

// --- Multer 配置 ---
const uploadDir = path.join(__dirname, "../../uploads/items");
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
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
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

  const uploadFunc = upload.array("images", 9);

  uploadFunc(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      console.error("❌ [Multer Error]:", err);
      return res.status(500).json({ message: `图片上传错误: ${err.message}` });
    } else if (err) {
      console.error("❌ [Unknown Upload Error]:", err);
      return res.status(500).json({ message: `上传未知错误: ${err.message}` });
    }
    const fileCount = (req.files as any)?.length || 0;
    console.log(`✅ [Upload] Success. Files received: ${fileCount}`);
    next();
  });
};

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

// 发布商品
router.post("/", authenticateToken, uploadMiddleware, createItem);

router.post("/:id/collect", authenticateToken, toggleCollect);
router.get("/:id/favorite", authenticateToken, checkFavorite);
router.get("/my", authenticateToken, getMyItems);
router.get("/favorites", authenticateToken, getMyFavorites);

// 更新商品
router.put("/:id", authenticateToken, updateUploadMiddleware, updateItem);

// ✅ [新增] 批量更新商品状态
router.post("/batch/status", authenticateToken, batchUpdateItemStatus);

// ✅ [新增] 获取详情 (⚠️ 必须放在最后，防止拦截 /market 或 /my)
router.get("/:id", getItemDetail);

export default router;
