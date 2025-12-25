// 文件路径: server/src/controllers/addressController.ts
import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/**
 * 获取用户的所有收货地址
 */
export const getAddresses = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const [addresses] = await pool.query<RowDataPacket[]>(
      `SELECT address_id, receiver_name, receiver_phone, address, is_default, created_at
       FROM User_Addresses
       WHERE user_id = ?
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    res.json({
      code: 200,
      data: addresses,
    });
  } catch (error) {
    console.error("获取地址列表失败:", error);
    res.status(500).json({ code: 500, message: "获取地址列表失败" });
  }
};

/**
 * 添加新的收货地址
 */
export const addAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { receiver_name, receiver_phone, address, is_default } = req.body;

    // 校验必填字段
    if (!receiver_name || !receiver_phone || !address) {
      res.status(400).json({ code: 400, message: "请填写完整的地址信息" });
      return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 如果设置为默认地址，先取消其他默认地址
      if (is_default === 1) {
        await connection.query(
          "UPDATE User_Addresses SET is_default = 0 WHERE user_id = ?",
          [userId]
        );
      }

      // 插入新地址
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO User_Addresses (user_id, receiver_name, receiver_phone, address, is_default)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, receiver_name, receiver_phone, address, is_default || 0]
      );

      await connection.commit();

      res.json({
        code: 200,
        message: "添加地址成功",
        data: { address_id: result.insertId },
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("添加地址失败:", error);
    res.status(500).json({ code: 500, message: "添加地址失败" });
  }
};

/**
 * 更新收货地址
 */
export const updateAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const addressId = parseInt(req.params.id);
    const { receiver_name, receiver_phone, address, is_default } = req.body;

    // 校验地址归属
    const [addresses] = await pool.query<RowDataPacket[]>(
      "SELECT user_id FROM User_Addresses WHERE address_id = ?",
      [addressId]
    );

    if (addresses.length === 0) {
      res.status(404).json({ code: 404, message: "地址不存在" });
      return;
    }

    if (addresses[0].user_id !== userId) {
      res.status(403).json({ code: 403, message: "无权修改此地址" });
      return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 如果设置为默认地址，先取消其他默认地址
      if (is_default === 1) {
        await connection.query(
          "UPDATE User_Addresses SET is_default = 0 WHERE user_id = ? AND address_id != ?",
          [userId, addressId]
        );
      }

      // 更新地址
      await connection.query(
        `UPDATE User_Addresses
         SET receiver_name = ?, receiver_phone = ?, address = ?, is_default = ?
         WHERE address_id = ?`,
        [receiver_name, receiver_phone, address, is_default || 0, addressId]
      );

      await connection.commit();

      res.json({
        code: 200,
        message: "更新地址成功",
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("更新地址失败:", error);
    res.status(500).json({ code: 500, message: "更新地址失败" });
  }
};

/**
 * 删除收货地址
 */
export const deleteAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const addressId = parseInt(req.params.id);

    // 校验地址归属
    const [addresses] = await pool.query<RowDataPacket[]>(
      "SELECT user_id FROM User_Addresses WHERE address_id = ?",
      [addressId]
    );

    if (addresses.length === 0) {
      res.status(404).json({ code: 404, message: "地址不存在" });
      return;
    }

    if (addresses[0].user_id !== userId) {
      res.status(403).json({ code: 403, message: "无权删除此地址" });
      return;
    }

    // 删除地址
    await pool.query("DELETE FROM User_Addresses WHERE address_id = ?", [
      addressId,
    ]);

    res.json({
      code: 200,
      message: "删除地址成功",
    });
  } catch (error) {
    console.error("删除地址失败:", error);
    res.status(500).json({ code: 500, message: "删除地址失败" });
  }
};

/**
 * 设置默认地址
 */
export const setDefaultAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const addressId = parseInt(req.params.id);

    // 校验地址归属
    const [addresses] = await pool.query<RowDataPacket[]>(
      "SELECT user_id FROM User_Addresses WHERE address_id = ?",
      [addressId]
    );

    if (addresses.length === 0) {
      res.status(404).json({ code: 404, message: "地址不存在" });
      return;
    }

    if (addresses[0].user_id !== userId) {
      res.status(403).json({ code: 403, message: "无权操作此地址" });
      return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 取消其他默认地址
      await connection.query(
        "UPDATE User_Addresses SET is_default = 0 WHERE user_id = ?",
        [userId]
      );

      // 设置新的默认地址
      await connection.query(
        "UPDATE User_Addresses SET is_default = 1 WHERE address_id = ?",
        [addressId]
      );

      await connection.commit();

      res.json({
        code: 200,
        message: "设置默认地址成功",
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("设置默认地址失败:", error);
    res.status(500).json({ code: 500, message: "设置默认地址失败" });
  }
};

/**
 * 获取默认地址
 */
export const getDefaultAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const [addresses] = await pool.query<RowDataPacket[]>(
      `SELECT address_id, receiver_name, receiver_phone, address, is_default
       FROM User_Addresses
       WHERE user_id = ? AND is_default = 1`,
      [userId]
    );

    if (addresses.length === 0) {
      res.json({
        code: 200,
        data: null,
        message: "未设置默认地址",
      });
      return;
    }

    res.json({
      code: 200,
      data: addresses[0],
    });
  } catch (error) {
    console.error("获取默认地址失败:", error);
    res.status(500).json({ code: 500, message: "获取默认地址失败" });
  }
};
