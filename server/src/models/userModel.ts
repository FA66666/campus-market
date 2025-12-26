import pool from "../config/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

// 定义用户接口
export interface User {
  user_id?: number;
  username: string;
  password_hash: string;
  student_id: string;
  real_name: string;
  auth_material?: string; // 认证材料图片路径
  status?: number;
  deleted_at?: Date | string | null;
}

export const UserModel = {
  // 根据用户名查找用户
  findByUsername: async (username: string): Promise<User | null> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM Users WHERE username = ?",
      [username]
    );
    return (rows.length > 0 ? rows[0] : null) as User;
  },

  // 创建新用户 (status=2 表示待审核)
  create: async (user: User): Promise<number> => {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO Users (username, password_hash, student_id, real_name, auth_material, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.username,
        user.password_hash,
        user.student_id,
        user.real_name,
        user.auth_material || null,
        2, // 待审核状态
      ]
    );
    return result.insertId;
  },
};
