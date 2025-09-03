CREATE DATABASE IF NOT EXISTS hospital_db;

USE hospital_db;

CREATE TABLE IF NOT EXISTS hospital_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hospital_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    access_level ENUM('admin', 'employee') NOT NULL
);