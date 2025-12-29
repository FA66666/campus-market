import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "market_app",
  password: process.env.DB_PASSWORD || "Market_Pwd_2025!",
  database: process.env.DB_NAME || "UniversitySecondHandDB",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
});

export const checkConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ 成功连接到数据库 UniversitySecondHandDB");
    connection.release();
  } catch (error) {
    console.error("❌ 数据库连接失败:", error);
    process.exit(1);
  }
};

export default pool;
