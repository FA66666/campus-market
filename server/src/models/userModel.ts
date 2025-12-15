import pool from "../config/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

// 定义用户接口
export interface User {
  user_id?: number;
  username: string;
  password_hash: string;
  student_id: string;
  real_name: string;
  status?: number;
  deleted_at?: Date | string | null; // ✅ 新增：解决 TS 报错
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

  // 创建新用户
  create: async (user: User): Promise<number> => {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO Users (username, password_hash, student_id, real_name, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [user.username, user.password_hash, user.student_id, user.real_name, 1]
    );
    return result.insertId;
  },
};
