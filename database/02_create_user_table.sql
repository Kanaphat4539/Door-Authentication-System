USE `web_app_db`;

-- สร้างตารางสำหรับเก็บประวัติการใช้งานหน้าเว็บของผู้ใช้ (ใช้ชื่อตาราง user)
CREATE TABLE IF NOT EXISTS `user` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ลำดับเหตุการณ์',
    `username` VARCHAR(100) NOT NULL COMMENT 'ชื่อผู้เข้าใช้งาน (Username/รหัสอาจารย์)',
    `action` VARCHAR(255) NOT NULL COMMENT 'การกระทำบนหน้าเว็บ เช่น Login>Search>Username',
    `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันเวลาที่เกิดเหตุการณ์ (UTC+7)',
    
    PRIMARY KEY (`id`),
    INDEX `idx_username` (`username`),
    INDEX `idx_timestamp` (`timestamp`),
    INDEX `idx_user_action_search` (`username`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางเก็บประวัติการใช้งานหน้าเว็บ';

-- ให้สิทธิ์ User app_backend ในการอ่านและเพิ่มข้อมูลในตาราง user
GRANT SELECT, INSERT ON web_app_db.user TO 'app_backend'@'%';
FLUSH PRIVILEGES;
