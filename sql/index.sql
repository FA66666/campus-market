USE `UniversitySecondHandDB`;

-- 1. 商品广场筛选优化 (Essential for C-03 Test Case)
-- 场景：前端“商品广场”页面，用户先选分类，再看已上架商品，并按发布时间倒序排列。
-- 优化 SQL: SELECT * FROM Items WHERE category_id = ? AND status = 1 ORDER BY created_at DESC;
-- 作用：避免 FileSort，利用索引覆盖查询和排序。
CREATE INDEX `idx_item_cat_status_time` ON `Items` (`category_id`, `status`, `created_at`);

-- 2. 后台审核队列优化
-- 场景：管理员进入后台，优先处理“待审核”状态的商品，通常按提交时间顺序处理。
-- 优化 SQL: SELECT * FROM Items WHERE status = 0 ORDER BY created_at ASC;
-- 作用：加速后台审核列表的加载速度。
CREATE INDEX `idx_item_audit_queue` ON `Items` (`status`, `created_at`);

-- 3. 定时任务优化 (可选，但推荐)
-- 场景：系统定时任务扫描超时未支付的订单并自动取消。
-- 优化 SQL: SELECT * FROM Orders WHERE status = 0 AND created_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE);
-- 作用：防止随订单量增长，定时任务变慢拖垮数据库。
CREATE INDEX `idx_order_status_created` ON `Orders` (`status`, `created_at`);