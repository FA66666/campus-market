-- 1. 商品广场视图 (封装复杂联表逻辑)
CREATE OR REPLACE VIEW v_market_items AS
SELECT
    i.item_id,
    i.seller_id,
    i.category_id, 
    i.title,
    i.price,
    i.stock_quantity,
    i.main_image,
    i.created_at,
    u.username AS seller_name,
    IFNULL(ist.view_count, 0) AS view_count,
    IFNULL(ist.collect_count, 0) AS collect_count
FROM Items i
JOIN Users u ON i.seller_id = u.user_id
LEFT JOIN Item_Statistics ist ON i.item_id = ist.item_id
WHERE i.status = 1 AND i.stock_quantity > 0 AND i.deleted_at IS NULL;

-- 2. 平台数据统计视图
CREATE OR REPLACE VIEW v_platform_stats AS
SELECT 
    (SELECT COUNT(*) FROM Users WHERE status = 1) AS total_active_users,
    (SELECT COUNT(*) FROM Items WHERE status = 1) AS active_items,
    (SELECT COUNT(*) FROM Orders WHERE status = 3) AS completed_orders,
    (SELECT IFNULL(SUM(total_amount), 0) FROM Orders WHERE status = 3) AS total_gmv;