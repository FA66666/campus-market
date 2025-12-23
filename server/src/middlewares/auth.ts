// 文件路径: server/src/middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// 扩展 Express 的 Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: any;
      admin?: {
        id: string;
        username: string;
        roles: string[];
      };
    }
  }
}

const getSecret = () => process.env.JWT_SECRET || "default_secret";

// 1. 前台用户认证 (保持不变)
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "未登录，无法操作" });
    return;
  }

  jwt.verify(token, getSecret(), (err: any, user: any) => {
    if (err) {
      res.status(403).json({ message: "Token 无效或已过期" });
      return;
    }
    // 简单的区分：如果 payload 里包含 roles，说明是误用了管理员 Token
    if (user.type === "admin") {
      res.status(403).json({ message: "请使用前台账号登录" });
      return;
    }
    req.user = user;
    next();
  });
};

// 2. 后台管理员认证 (新增)
export const authenticateAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "管理员未登录" });
    return;
  }

  jwt.verify(token, getSecret(), (err: any, decoded: any) => {
    if (err) {
      res.status(403).json({ message: "会话已过期，请重新登录" });
      return;
    }

    // 检查是否为管理员 Token
    if (decoded.type !== "admin" || !decoded.roles) {
      res.status(403).json({ message: "非管理员账号，拒绝访问" });
      return;
    }

    req.admin = {
      id: decoded.userId,
      username: decoded.username,
      roles: decoded.roles,
    };
    next();
  });
};

// 3. 角色权限检查 (新增)
// 用法: router.get(..., requireRole('SUPER_ADMIN'), ...)
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      res.status(401).json({ message: "未授权" });
      return;
    }

    // 只要拥有允许的角色之一即可通过
    const hasPermission = req.admin.roles.some((role) =>
      allowedRoles.includes(role)
    );

    if (!hasPermission) {
      res.status(403).json({
        message: `权限不足，需要以下角色之一: ${allowedRoles.join(", ")}`,
      });
      return;
    }

    next();
  };
};
