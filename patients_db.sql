DROP DATABASE patient_db;
CREATE DATABASE IF NOT EXISTS patient_db;
USE patient_db;

CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    age INT,
    gender ENUM('Male', 'Female', 'Unspecified') DEFAULT 'Unspecified',
    heart_rate INT,
    pulse_rate INT,
    spo2 INT,
    temp_celsius DECIMAL(5,1),
    temp_fahrenheit DECIMAL(5,1),
    bp_systolic INT,
    bp_diastolic INT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    patient_id VARCHAR(20) NOT NULL,
    action VARCHAR(20) NOT NULL,
    field VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id),
    INDEX (patient_id),
    INDEX (timestamp)
);