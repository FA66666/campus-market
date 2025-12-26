import { Router, Request, Response, NextFunction } from "express";
import { register, login } from "../controllers/authController";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// 配置认证材料上传目录
const uploadDir = path.join(__dirname, "../../uploads/auth");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "auth-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("只支持 jpg, jpeg, png, gif 格式的图片"));
    }
  },
});

// 上传中间件
const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.single("auth_image")(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: "文件上传错误: " + err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// 定义 POST 路由
router.post("/register", uploadMiddleware, register);
router.post("/login", login);

export default router;
