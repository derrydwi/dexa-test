CREATE DATABASE IF NOT EXISTS identity_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS attendance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'identity'@'%' IDENTIFIED BY 'identity_local';
CREATE USER IF NOT EXISTS 'attendance'@'%' IDENTIFIED BY 'attendance_local';
GRANT ALL PRIVILEGES ON identity_db.* TO 'identity'@'%';
GRANT ALL PRIVILEGES ON attendance_db.* TO 'attendance'@'%';
