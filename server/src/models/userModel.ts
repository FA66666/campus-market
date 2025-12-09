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
      // 注意：为了方便测试，我们将 status 默认设为 1 (正常)，
      // 实际生产中应设为 2 (待审核) 并走审核流程。
    );
    return result.insertId;
  },
};
