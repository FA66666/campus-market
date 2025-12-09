import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, student_id, real_name } = req.body;

    // 1. 简单校验
    if (!username || !password || !student_id || !real_name) {
      res.status(400).json({ message: "所有字段都是必填的" });
      return;
    }

    // 2. 检查用户是否存在
    const existingUser = await UserModel.findByUsername(username);
    if (existingUser) {
      res.status(409).json({ message: "用户名已存在" });
      return;
    }

    // 3. 密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. 创建用户
    const userId = await UserModel.create({
      username,
      password_hash: hashedPassword,
      student_id,
      real_name,
    });

    res.status(201).json({ message: "注册成功", userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "服务器错误" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // 1. 查找用户
    const user = await UserModel.findByUsername(username);
    if (!user) {
      res.status(401).json({ message: "用户名或密码错误" });
      return;
    }

    // 2. 验证密码
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ message: "用户名或密码错误" });
      return;
    }

    // 3. 检查状态
    if (user.status !== 1) {
      res.status(403).json({ message: "账户状态异常（待审核或被封禁）" });
      return;
    }

    // 4. 生成 Token
    const token = jwt.sign(
      { userId: user.user_id, username: user.username },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "24h" }
    );

    res.json({
      message: "登录成功",
      token,
      user: {
        id: user.user_id,
        username: user.username,
        real_name: user.real_name,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "服务器错误" });
  }
};
