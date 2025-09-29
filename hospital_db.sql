DROP DATABASE hospital_db;
CREATE DATABASE IF NOT EXISTS hospital_db;

USE hospital_db;

CREATE TABLE IF NOT EXISTS hospital_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hospital_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    access_level ENUM('admin', 'employee') NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Admin Logs Table
CREATE TABLE IF NOT EXISTS admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id VARCHAR(50) NOT NULL,
    admin_name VARCHAR(100) NOT NULL,
    target_id VARCHAR(50) NOT NULL,
    target_name VARCHAR(100) NOT NULL,
    target_access_level ENUM('admin', 'employee') NOT NULL,
    action ENUM('create_user', 'delete_user', 'reset_password') NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (admin_id),
    INDEX (target_id),
    INDEX (timestamp)
);

INSERT INTO hospital_users (hospital_id, name, access_level, password) VALUES
('ADM123', 'Admin User', 'admin', SHA2('admin123', 256)),
('EMP456', 'John Doe', 'employee', SHA2('johnpass', 256)),
('EMP789', 'Anna Lim', 'employee', SHA2('annapass', 256));