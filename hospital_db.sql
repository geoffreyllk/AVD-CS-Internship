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

INSERT INTO hospital_users (hospital_id, name, access_level, password) VALUES
('ADM123', 'Admin User', 'admin', SHA2('admin123', 256)),
('EMP456', 'John Doe', 'employee', SHA2('johnpass', 256)),
('EMP789', 'Anna Lim', 'employee', SHA2('annapass', 256));