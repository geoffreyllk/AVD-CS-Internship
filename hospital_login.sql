CREATE DATABASE IF NOT EXISTS hospital_db;

USE hospital_db;

CREATE TABLE IF NOT EXISTS hospital_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hospital_id VARCHAR(50) NOT NULL UNIQUE,
    access_level ENUM('admin', 'employee') NOT NULL
);

INSERT INTO hospital_users (hospital_id, access_level) VALUES
('ADM123', 'admin'),
('EMP456', 'employee'),
('EMP789', 'employee');