import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// 扩展 Express 的 Request 类型，让它支持 user 属性
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
  // 1. 获取 Header 中的 Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // 取出 Bearer 后面的那串字符

  if (!token) {
    res.status(401).json({ message: "未登录，无法操作" });
    return;
  }

  // 2. 验证 Token
  jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ message: "Token 无效或已过期" });
      return;
    }
    // 3. 验证通过，把用户信息存入 req.user，后续控制器就能用了
    req.user = user;
    next();
  });
};
