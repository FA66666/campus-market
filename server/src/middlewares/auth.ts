// 文件路径: server/src/middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// 扩展 Express 的 Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 🔍 [调试日志 1] 确认请求是否进入了后端
  console.log(`🔐 [Auth] Request received: ${req.method} ${req.originalUrl}`);

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.warn("⚠️ [Auth] No token provided");
    res.status(401).json({ message: "未登录，无法操作" });
    return;
  }

  // ✅ [修复点] 给密钥一个默认值，防止因读取不到 .env 而崩溃
  // 注意：这必须和 authController.ts 里的登录签名密钥保持一致！
  const secret = process.env.JWT_SECRET || "default_secret";

  try {
    jwt.verify(token, secret, (err: any, user: any) => {
      if (err) {
        console.error("❌ [Auth] Token verification failed:", err.message);
        res.status(403).json({ message: "Token 无效或已过期" });
        return;
      }
      // 验证通过
      req.user = user;
      // 🔍 [调试日志 2] 验证成功
      console.log(`✅ [Auth] User verified: ${user?.username || user?.userId}`);
      next();
    });
  } catch (error) {
    // 捕获任何可能的同步错误
    console.error("🔥 [Auth] Critical Error:", error);
    res.status(500).json({ message: "服务器认证系统异常" });
  }
};
