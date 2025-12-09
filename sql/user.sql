USE `UniversitySecondHandDB`;

-- 1. 清理旧账户 (如果存在)
DROP USER IF EXISTS 'market_app'@'%';

-- 2. 创建应用专用账户
CREATE USER 'market_app'@'%' IDENTIFIED BY 'Market_Pwd_2025!';

-- 3. 授予业务操作权限 (DML)
-- 允许: 查询(SELECT), 插入(INSERT), 修改(UPDATE), 删除(DELETE)
GRANT SELECT, INSERT, UPDATE, DELETE ON UniversitySecondHandDB.* TO 'market_app'@'%';

-- 4. 授予存储过程执行权限
-- 允许: 调用 sp_create_order 等存储过程
GRANT EXECUTE ON UniversitySecondHandDB.* TO 'market_app'@'%';

-- 5. (重要) 拒绝高危权限
-- 注意：MySQL 默认是不授予 DROP/ALTER 的，所以不需要显式 REVOKE。
-- 只要不执行 GRANT ALL，该用户就无法删除表。

-- 6. 刷新权限表使配置生效
FLUSH PRIVILEGES;
