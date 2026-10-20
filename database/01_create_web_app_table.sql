-- 1. สร้างฐานข้อมูล
CREATE DATABASE IF NOT EXISTS `web_app_db`
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE `web_app_db`;

-- 2. สร้างตาราง web_app พร้อม Index และ Unique Key
CREATE TABLE IF NOT EXISTS `web_app` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
    `timestamp` DATETIME NOT NULL COMMENT 'เวลาสแกน (UTC+7)',
    `student_id` VARCHAR(20) NOT NULL COMMENT 'รหัสผู้ใช้งาน/นักศึกษา',
    `student_name` VARCHAR(150) NOT NULL COMMENT 'ชื่อ-นามสกุล',
    `room` VARCHAR(10) NOT NULL COMMENT 'รหัสห้อง เช่น B316, B317',
    `status` ENUM('IN', 'OUT') NOT NULL COMMENT 'สถานะเข้า-ออก',
    
    PRIMARY KEY (`id`),
    INDEX `idx_timestamp` (`timestamp`),
    INDEX `idx_student_id` (`student_id`),
    INDEX `idx_room` (`room`),
    INDEX `idx_status` (`status`),
    INDEX `idx_search_composite` (`timestamp`, `room`),
    UNIQUE KEY `uk_access_log` (`timestamp`, `student_id`, `room`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. สร้าง User และสิทธิ์การใช้งานสำหรับ Backend
CREATE USER IF NOT EXISTS 'app_backend'@'%' IDENTIFIED BY 'Password1234!';
GRANT SELECT, INSERT ON web_app_db.web_app TO 'app_backend'@'%';
FLUSH PRIVILEGES;

EXIT;
