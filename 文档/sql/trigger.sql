DELIMITER //
-- 1. 收藏数据实时同步触发器
-- 当用户收藏时，自动增加统计表中的计数
CREATE TRIGGER trg_fav_add
AFTER INSERT ON Favorites
FOR EACH ROW
BEGIN
    -- 使用 ON DUPLICATE KEY UPDATE 防止统计表行不存在
    INSERT INTO Item_Statistics (item_id, collect_count) VALUES (NEW.item_id, 1)
    ON DUPLICATE KEY UPDATE collect_count = collect_count + 1;
END;

//
-- 2. 取消收藏同步触发器
--  GREATEST 防御性编程，防止因数据不一致导致的无符号整数溢出错误
CREATE TRIGGER trg_fav_del
AFTER DELETE ON Favorites
FOR EACH ROW
BEGIN
    UPDATE Item_Statistics 
    SET collect_count = GREATEST(CAST(collect_count AS SIGNED) - 1, 0) 
    WHERE item_id = OLD.item_id;
END;
//

-- 3. 智能库存回滚触发器
-- 订单取消时，恢复库存，并智能恢复上架状态
CREATE TRIGGER trg_restore_stock
AFTER UPDATE ON Orders
FOR EACH ROW
BEGIN
    IF NEW.status = 4 AND OLD.status != 4 THEN
        UPDATE Items i
        JOIN Order_Items oi ON i.item_id = oi.item_id
        SET 
            i.stock_quantity = i.stock_quantity + oi.quantity,
            -- 仅恢复因自动售罄(status=2)而下架的商品
            -- 若商品是卖家主动违规下架(3)或手动下架(4)，即使库存恢复，也不应自动上架，需人工干预。
            i.status = IF(i.status = 2, 1, i.status)
        WHERE oi.order_id = NEW.order_id;
    END IF;
END;
//
DELIMITER ;