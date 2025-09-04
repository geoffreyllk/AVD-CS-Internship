const mysql = require('mysql2');

// Database configuration
const config = {
  host: 'localhost',
  user: 'root',
  password: 'avdex2025'
};

async function setupDatabases() {
  try {
    // Create connection without specifying database
    const connection = mysql.createConnection(config);
    
    console.log('🔧 Setting up databases...');
    
    // Create hospital database and users table
    console.log('📋 Creating hospital database...');
    await connection.promise().query('CREATE DATABASE IF NOT EXISTS hospital_db');
    await connection.promise().query('USE hospital_db');
    
    await connection.promise().query(`
      CREATE TABLE IF NOT EXISTS hospital_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hospital_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        access_level ENUM('admin', 'employee') DEFAULT 'employee',
        password VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Hospital database setup completed');
    
    // Create patient database and tables
    console.log('Creating patient database...');
    await connection.promise().query('CREATE DATABASE IF NOT EXISTS patient_db');
    await connection.promise().query('USE patient_db');
    
    await connection.promise().query(`
      CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        age INT,
        gender ENUM('Male', 'Female', 'Unspecified') DEFAULT 'Unspecified',
        heart_rate INT,
        pulse_rate INT,
        spo2 INT,
        temp_celsius DECIMAL(5,2),
        temp_fahrenheit DECIMAL(5,2),
        bp_systolic INT,
        bp_diastolic INT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.promise().query(`
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
      )
    `);
    
    // Insert sample patient data
    await connection.promise().query(`
      INSERT IGNORE INTO patients (id, name, age, gender, heart_rate, pulse_rate, spo2, temp_celsius, temp_fahrenheit, bp_systolic, bp_diastolic) VALUES
      ('P001', 'John Doe', 54, 'Male', 72, 72, 98, 36.6, 97.9, 120, 80),
      ('P002', 'Amira Yusof', 43, 'Female', 75, 74, 99, 37.0, 98.6, 118, 78),
      ('P003', 'Tan Wei Lun', 68, 'Male', 68, 67, 97, 36.8, 98.2, 130, 85),
      ('P004', 'Sophia Lee', 29, 'Female', 82, 81, 100, 36.5, 97.7, 110, 70)
    `);
    
    console.log('✅ Patient database setup completed');
    console.log('🎉 All databases setup completed successfully!');
    
    connection.end();
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n📋 Make sure:');
    console.log('1. XAMPP is running');
    console.log('2. MySQL service is started');
    console.log('3. Password "avdex2025" is correct for root user');
  }
}

setupDatabases();
