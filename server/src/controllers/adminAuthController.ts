// 文件路径: server/src/controllers/adminAuthController.ts
import { Request, Response } from "express";
import pool from "../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { RowDataPacket } from "mysql2";

export const adminLogin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: "请输入用户名和密码" });
      return;
    }

    // 1. 查询管理员用户
    const userSql = "SELECT * FROM sys_user WHERE username = ? AND status = 1";
    const [users] = await pool.query<RowDataPacket[]>(userSql, [username]);

    if (users.length === 0) {
      res.status(401).json({ message: "账号不存在或已被禁用" });
      return;
    }

    const adminUser = users[0];

    // 2. 验证密码
    // 注意：假设数据库中存的是 bcrypt 哈希。如果您的设计文档中"salt"是用于手动哈希，请相应调整。
    // 这里采用通用的 bcrypt.compare
    const isMatch = await bcrypt.compare(password, adminUser.password);
    if (!isMatch) {
      res.status(401).json({ message: "密码错误" });
      return;
    }

    // 3. 获取角色列表
    const roleSql = `
      SELECT r.role_code 
      FROM sys_role r
      JOIN sys_user_role ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `;
    const [roles] = await pool.query<RowDataPacket[]>(roleSql, [adminUser.id]);
    const roleCodes = roles.map((r) => r.role_code); // 例如 ['SUPER_ADMIN', 'AUDITOR']

    // 4. 生成 Admin Token
    const token = jwt.sign(
      {
        userId: adminUser.id,
        username: adminUser.username,
        roles: roleCodes,
        type: "admin", // 关键标记，用于中间件区分
      },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "4h" } // 后台 Session 通常短一些
    );

    res.json({
      code: 200,
      message: "登录成功",
      token,
      data: {
        id: adminUser.id,
        username: adminUser.username,
        realname: adminUser.realname,
        roles: roleCodes,
      },
    });
  } catch (error) {
    console.error("管理员登录异常:", error);
    res.status(500).json({ message: "服务器内部错误" });
  }
};
