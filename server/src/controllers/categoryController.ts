import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

// 定义分类数据接口
interface Category {
  category_id: number;
  category_name: string;
  parent_id: number | null;
  children?: Category[]; // 扩展属性，用于存放子节点
}

// 获取分类树
export const getCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 1. 一次性查出所有分类
    const sql =
      "SELECT * FROM Categories ORDER BY parent_id ASC, category_id ASC";
    const [rows] = await pool.query<RowDataPacket[]>(sql);

    const categories = rows as Category[];
    const categoryMap = new Map<number, Category>();
    const tree: Category[] = [];

    // 2. 初始化 Map，方便通过 ID 快速查找引用
    categories.forEach((cat) => {
      // 必须初始化 children 数组，否则前端可能报错
      cat.children = [];
      categoryMap.set(cat.category_id, cat);
    });

    // 3. 构建树形结构
    categories.forEach((cat) => {
      if (cat.parent_id) {
        // 如果有父节点，将自己添加到父节点的 children 中
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children!.push(cat);
        }
      } else {
        // 如果没有父节点（根节点），直接放入顶层树数组
        tree.push(cat);
      }
    });

    res.json({
      code: 200,
      data: tree,
      message: "获取分类树成功",
    });
  } catch (error) {
    console.error("获取分类失败:", error);
    res.status(500).json({ message: "服务器内部错误" });
  }
};
