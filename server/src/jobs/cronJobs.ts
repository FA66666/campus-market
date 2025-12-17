import cron from "node-cron";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

// 启动所有定时任务
export const startCronJobs = () => {
  console.log("⏰ 定时任务系统已启动");

  // 任务：每分钟检查一次超时未支付订单
  // Cron 表达式 '*/1 * * * *' 代表每分钟执行一次
  cron.schedule("*/1 * * * *", async () => {
    // console.log('⏳ [Cron] 开始检查超时未支付订单...');

    const connection = await pool.getConnection();
    try {
      // 1. 定义超时时间（例如 30 分钟）
      const timeoutMinutes = 1;

      // 2. 查找超时订单
      // status = 0 (待付款) 且 创建时间早于 (当前时间 - 30分钟)
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT order_id FROM Orders 
                 WHERE status = 0 
                 AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
        [timeoutMinutes]
      );

      if (rows.length > 0) {
        const orderIds = rows.map((row) => row.order_id);
        console.log(
          `🔍 [Cron] 发现 ${rows.length} 个超时订单: ${orderIds.join(", ")}`
        );

        // 3. 批量更新状态为 4 (取消)
        // ⚠️ 关键：依赖数据库触发器 trg_restore_stock 自动回滚库存
        await connection.query(
          `UPDATE Orders SET status = 4 WHERE order_id IN (?)`,
          [orderIds]
        );

        console.log(`✅ [Cron] 已自动取消 ${rows.length} 个订单，库存已回滚`);
      }
    } catch (error) {
      console.error("❌ [Cron] 订单检查任务出错:", error);
    } finally {
      connection.release();
    }
  });
};
