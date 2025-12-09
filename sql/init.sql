DROP DATABASE IF EXISTS `UniversitySecondHandDB`;
CREATE DATABASE `UniversitySecondHandDB` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `UniversitySecondHandDB`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `Users`;
CREATE TABLE `Users` (
  `user_id` INT NOT NULL AUTO_INCREMENT COMMENT '用户主键ID',
  `username` VARCHAR(50) NOT NULL COMMENT '登录账号',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'BCrypt加密密码',
  `student_id` VARCHAR(20) NOT NULL COMMENT '学号/工号(实名认证凭证)',
  `real_name` VARCHAR(50) NOT NULL COMMENT '真实姓名',
  `auth_material` VARCHAR(512) DEFAULT NULL COMMENT '认证材料路径',
  `credit_score` INT DEFAULT 100 COMMENT '信誉积分',
  `status` TINYINT DEFAULT 2 COMMENT '0:封禁, 1:正常, 2:待审核, 3:认证驳回',
  `deleted_at` DATETIME DEFAULT NULL COMMENT '软删除时间戳',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `chk_user_credit` CHECK (`credit_score` >= 0),
  UNIQUE KEY `uk_student_id` (`student_id`),
  UNIQUE KEY `uk_active_username` (`username`, (IF(`deleted_at` IS NULL, 1, NULL)))
) ENGINE=InnoDB COMMENT='前台用户表';

DROP TABLE IF EXISTS `Categories`;
CREATE TABLE `Categories` (
  `category_id` INT NOT NULL AUTO_INCREMENT,
  `category_name` VARCHAR(50) NOT NULL,
  `parent_id` INT DEFAULT NULL COMMENT '父分类ID，一级分类为NULL',
  PRIMARY KEY (`category_id`),
  KEY `idx_parent_id` (`parent_id`),
  CONSTRAINT `fk_category_parent` FOREIGN KEY (`parent_id`) REFERENCES `Categories` (`category_id`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='商品分类表';

DROP TABLE IF EXISTS `Items`;
CREATE TABLE `Items` (
  `item_id` INT NOT NULL AUTO_INCREMENT,
  `seller_id` INT NOT NULL COMMENT '卖家ID',
  `category_id` INT NOT NULL COMMENT '分类ID',
  `title` VARCHAR(100) NOT NULL COMMENT '商品标题',
  `description` TEXT COMMENT '商品详细描述',
  `price` DECIMAL(12, 2) NOT NULL COMMENT '价格',
  `stock_quantity` INT DEFAULT 1 COMMENT '库存',
  `status` TINYINT DEFAULT 0 COMMENT '0:待审核, 1:上架, 2:缺货, 3:违规, 4:下架',
  `main_image` VARCHAR(512) NOT NULL COMMENT '主图路径',
  `deleted_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`),
  KEY `idx_seller_id` (`seller_id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_item_status_date` (`status`, `created_at`),
  CONSTRAINT `chk_item_price` CHECK (`price` >= 0),
  CONSTRAINT `chk_item_stock` CHECK (`stock_quantity` >= 0),
  CONSTRAINT `fk_items_seller` FOREIGN KEY (`seller_id`) REFERENCES `Users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_items_category` FOREIGN KEY (`category_id`) REFERENCES `Categories` (`category_id`) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='商品信息表';

DROP TABLE IF EXISTS `Favorites`;
CREATE TABLE `Favorites` (
  `user_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `item_id`),
  KEY `idx_fav_item` (`item_id`),
  CONSTRAINT `fk_fav_user` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fav_item` FOREIGN KEY (`item_id`) REFERENCES `Items` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='用户收藏表';

DROP TABLE IF EXISTS `Orders`;
CREATE TABLE `Orders` (
  `order_id` INT NOT NULL AUTO_INCREMENT,
  `buyer_id` INT NOT NULL COMMENT '买家ID',
  `seller_id` INT NOT NULL COMMENT '卖家ID(冗余字段，优化查询)',
  `total_amount` DECIMAL(12, 2) NOT NULL COMMENT '订单总额',
  `delivery_snapshot` VARCHAR(255) NOT NULL COMMENT '收货地址快照',
  `receiver_phone` VARCHAR(20) NOT NULL COMMENT '收货人电话快照',
  `transaction_ref` VARCHAR(64) DEFAULT NULL COMMENT '支付流水号',
  `payment_proof` VARCHAR(512) DEFAULT NULL COMMENT '支付凭证图',
  `status` TINYINT DEFAULT 0 COMMENT '0:待付, 1:待发, 2:待收, 3:完成, 4:取消',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  KEY `idx_buyer_orders` (`buyer_id`),
  KEY `idx_seller_orders` (`seller_id`),
  CONSTRAINT `fk_order_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `Users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_order_seller` FOREIGN KEY (`seller_id`) REFERENCES `Users` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='订单主表';

DROP TABLE IF EXISTS `Order_Items`;
CREATE TABLE `Order_Items` (
  `detail_id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(12, 2) NOT NULL,
  PRIMARY KEY (`detail_id`),
  -- 优化 "SELECT * FROM Order_Items WHERE order_id = ?" (买家看订单详情)
  UNIQUE KEY `uk_order_item` (`order_id`, `item_id`),
  
  -- 优化 "SELECT * FROM Order_Items WHERE item_id = ?" (卖家看商品销售记录)
  -- 避免因不满足最左前缀而导致的全表扫描
  KEY `idx_item_id` (`item_id`),
  
  CONSTRAINT `fk_detail_order` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_detail_item` FOREIGN KEY (`item_id`) REFERENCES `Items` (`item_id`) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='订单明细表';

DROP TABLE IF EXISTS `Reviews`;
CREATE TABLE `Reviews` (
  `review_id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `user_id` INT NOT NULL COMMENT '评价人',
  `to_user_id` INT NOT NULL COMMENT '被评价人',
  `rating` TINYINT NOT NULL COMMENT '评分 1-5',
  `content` VARCHAR(500) DEFAULT NULL,
  `is_hidden` TINYINT DEFAULT 0 COMMENT '0:正常, 1:屏蔽',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `uk_order_review` (`order_id`, `user_id`),
  CONSTRAINT `chk_rating_range` CHECK (`rating` BETWEEN 1 AND 5),
  CONSTRAINT `fk_review_order` FOREIGN KEY (`order_id`) REFERENCES `Orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_from` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_to` FOREIGN KEY (`to_user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='交易评价表';

DROP TABLE IF EXISTS `Complaints`;
CREATE TABLE `Complaints` (
  `complaint_id` INT NOT NULL AUTO_INCREMENT,
  `reporter_id` INT NOT NULL COMMENT '投诉人ID',
  `target_id` INT NOT NULL COMMENT '被投诉对象ID (用户ID/商品ID/订单ID)',
  `target_type` TINYINT NOT NULL COMMENT '对象类型 1:用户, 2:商品, 3:订单',
  `reason` VARCHAR(255) NOT NULL COMMENT '投诉原因',
  `proof_img` VARCHAR(512) DEFAULT NULL COMMENT '证据图片路径',
  `status` TINYINT DEFAULT 0 COMMENT '0:待处理, 1:驳回, 2:已处理',
  `admin_reply` TEXT COMMENT '管理员处理回复',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`complaint_id`),
  KEY `idx_target` (`target_id`, `target_type`),
  CONSTRAINT `fk_complaint_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='投诉记录表';

DROP TABLE IF EXISTS `Messages`;
CREATE TABLE `Messages` (
  `message_id` INT NOT NULL AUTO_INCREMENT,
  `sender_id` INT NOT NULL,
  `receiver_id` INT NOT NULL,
  `item_id` INT DEFAULT NULL,
  `content` VARCHAR(500) NOT NULL,
  `is_read` TINYINT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  
  -- 优化 "已发送" 和 "特定会话记录" (WHERE sender_id = ? AND receiver_id = ?)
  KEY `idx_msg_chat` (`sender_id`, `receiver_id`),
  
  -- 优化 "收件箱" 和 "未读消息统计" (WHERE receiver_id = ? AND is_read = 0)
  -- 解决问题：收件箱查询频率最高，必须有独立的最左前缀索引;带上 is_read 字段，可以直接覆盖“查未读数”的场景
  KEY `idx_receiver_read` (`receiver_id`, `is_read`),
  
  CONSTRAINT `fk_msg_sender` FOREIGN KEY (`sender_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='站内信表';;

DROP TABLE IF EXISTS `Item_Statistics`;
CREATE TABLE `Item_Statistics` (
  `item_id` INT NOT NULL,
  `view_count` INT UNSIGNED DEFAULT 0,
  `collect_count` INT UNSIGNED DEFAULT 0,
  PRIMARY KEY (`item_id`),
  CONSTRAINT `fk_stat_item` FOREIGN KEY (`item_id`) REFERENCES `Items` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='商品数据统计表';

DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
  `id` VARCHAR(32) NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `realname` VARCHAR(100) DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `salt` VARCHAR(45) DEFAULT NULL,
  `org_code` VARCHAR(64) DEFAULT NULL,
  `status` TINYINT DEFAULT 1 COMMENT '1-正常, 2-冻结',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sys_username` (`username`)
) ENGINE=InnoDB COMMENT='后台管理员表';

DROP TABLE IF EXISTS `sys_depart`;
CREATE TABLE `sys_depart` (
  `id` VARCHAR(32) NOT NULL,
  `depart_name` VARCHAR(100) NOT NULL,
  `org_code` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB COMMENT='部门表';

DROP TABLE IF EXISTS `sys_role`;
CREATE TABLE `sys_role` (
  `id` VARCHAR(32) NOT NULL,
  `role_name` VARCHAR(100) NOT NULL,
  `role_code` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`role_code`)
) ENGINE=InnoDB COMMENT='角色表';

DROP TABLE IF EXISTS `sys_user_role`;
CREATE TABLE `sys_user_role` (
  `id` VARCHAR(32) NOT NULL,
  `user_id` VARCHAR(32) NOT NULL,
  `role_id` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
  CONSTRAINT `fk_sur_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sur_role` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='用户角色关联表';

DROP TABLE IF EXISTS `sys_user_depart`;
CREATE TABLE `sys_user_depart` (
  `id` VARCHAR(32) NOT NULL,
  `user_id` VARCHAR(32) NOT NULL,
  `dep_id` VARCHAR(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sud_user` (`user_id`),
  CONSTRAINT `fk_sud_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sud_dep` FOREIGN KEY (`dep_id`) REFERENCES `sys_depart` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='用户部门关联表';

SET FOREIGN_KEY_CHECKS = 1;