DELIMITER //

DROP PROCEDURE IF EXISTS sp_create_order //

CREATE PROCEDURE sp_create_order(
    IN p_buyer_id INT,
    IN p_seller_id INT,
    IN p_items_json JSON, 
    IN p_addr_snapshot VARCHAR(255),
    IN p_phone_snapshot VARCHAR(20),
    OUT p_res_code INT, 
    OUT p_order_id INT
)
BEGIN
    DECLARE v_total DECIMAL(12,2) DEFAULT 0;
    DECLARE v_itm_id INT;
    DECLARE v_qty INT;
    DECLARE v_price DECIMAL(12,2);
    DECLARE v_stock INT;
    DECLARE v_status TINYINT;
    DECLARE v_real_seller_id INT;
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE cur_items CURSOR FOR 
        SELECT item_id, qty 
        FROM JSON_TABLE(p_items_json, "$[*]" COLUMNS(item_id INT PATH "$.item_id", qty INT PATH "$.qty")) AS jt
        ORDER BY item_id ASC;
        
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; SET p_res_code=500; END;

    START TRANSACTION;

    OPEN cur_items;
    check_loop: LOOP
        FETCH cur_items INTO v_itm_id, v_qty;
        IF done THEN LEAVE check_loop; END IF;
        
        SET v_real_seller_id = NULL;

        SELECT price, stock_quantity, status, seller_id 
        INTO v_price, v_stock, v_status, v_real_seller_id
        FROM Items WHERE item_id = v_itm_id FOR UPDATE; 
        
        IF v_real_seller_id IS NULL THEN ROLLBACK; SET p_res_code = 404; CLOSE cur_items; LEAVE check_loop; END IF;
        IF v_real_seller_id != p_seller_id THEN ROLLBACK; SET p_res_code = 403; CLOSE cur_items; LEAVE check_loop; END IF;
        IF v_status != 1 THEN ROLLBACK; SET p_res_code = 402; CLOSE cur_items; LEAVE check_loop; 
        ELSEIF v_stock < v_qty THEN ROLLBACK; SET p_res_code = 400; CLOSE cur_items; LEAVE check_loop; END IF;
        
        SET v_total = v_total + (v_price * v_qty);
    END LOOP;
    CLOSE cur_items;

    IF p_res_code IS NULL THEN
        INSERT INTO Orders (buyer_id, seller_id, total_amount, status, delivery_snapshot, receiver_phone) 
        VALUES (p_buyer_id, p_seller_id, v_total, 0, p_addr_snapshot, p_phone_snapshot);
        SET p_order_id = LAST_INSERT_ID();

        SET @i = 0;
        WHILE @i < JSON_LENGTH(p_items_json) DO
            SET v_itm_id = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', @i, '].item_id')));
            SET v_qty = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', @i, '].qty')));
            SELECT price INTO v_price FROM Items WHERE item_id = v_itm_id;
            
            INSERT INTO Order_Items (order_id, item_id, quantity, unit_price) 
            VALUES (p_order_id, v_itm_id, v_qty, v_price);
            
            -- [核心修复点] 
            -- 这里的 stock_quantity 已经是减去 v_qty 后的新值
            -- 所以直接判断 IF(stock_quantity = 0) 即可
            UPDATE Items 
            SET stock_quantity = stock_quantity - v_qty,
                status = IF(stock_quantity = 0, 2, status)
            WHERE item_id = v_itm_id;
            
            SET @i = @i + 1;
        END WHILE;
        COMMIT; SET p_res_code = 200;
    END IF;
END //
DELIMITER ;