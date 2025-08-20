const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.static(__dirname));
app.use(express.json());

// Database connections
const hospitalDB = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'avdex2025',
  database: 'hospital_db'
});

const patientDB = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'avdex2025',
  database: 'patient_db',
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connections
hospitalDB.connect((err) => {
  if (err) {
    console.error('❌ Failed to connect to hospital_db:', err.message);
  } else {
    console.log('✅ Connected to hospital_db successfully');
  }
});

patientDB.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Failed to connect to patient_db:', err.message);
  } else {
    console.log('✅ Connected to patient_db successfully');
    connection.release();
  }
});

// Get hospital users for authentication
app.get('/api/hospital-users', (req, res) => {
  hospitalDB.query('SELECT hospital_id, name, access_level FROM hospital_users', (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch hospital users' });
    res.json(results);
  });
});

// Get all patients
app.get('/api/patients', (req, res) => {
  patientDB.query('SELECT * FROM patients', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    // Map to match existing frontend structure
    const formatted = results.map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      heartRate: p.heart_rate,
      pulseRate: p.pulse_rate,
      spo2: p.spo2,
      temperature: {
        celsius: p.temp_celsius,
        fahrenheit: p.temp_fahrenheit
      },
      bloodPressure: {
        systolic: p.bp_systolic,
        diastolic: p.bp_diastolic
      },
      lastUpdated: p.last_updated
    }));

    res.json(formatted);
  });
});

// Helper function to log patient updates
function logPatientUpdate(userId, userName, patientId, field, oldValue, newValue) {
  if (field === 'Temperature (C)' || field === 'Temperature (F)') {
      oldValue = oldValue !== null ? parseFloat(oldValue).toFixed(1) : oldValue;
      newValue = newValue !== null ? parseFloat(newValue).toFixed(1) : newValue;

      // Don't log if values are the same
      if (oldValue === newValue) {
        return;
      }
  }
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const query = `
    INSERT INTO audit_logs (user_id, user_name, patient_id, action, field, old_value, new_value, timestamp)
    VALUES (?, ?, ?, 'UPDATE', ?, ?, ?, ?)
  `;

  const values = [userId, userName, patientId, field, oldValue, newValue, timestamp];

  patientDB.query(query, values, (err) => {
    if (err) {
      console.error('Failed to log update:', err);
    }
  });
}

// Update patient
app.put('/api/patients/:id', (req, res) => {
  const patientId = req.params.id;
  const userId = req.headers['x-user-id'] || 'unknown';
  const userName = req.headers['x-user-name'] || 'Unknown User';

  // get the current patient data to compare with new values
  patientDB.query('SELECT * FROM patients WHERE id = ?', [patientId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'Patient not found' });

    const oldPatient = results[0];
    const updateData = {
      name: req.body.name,
      age: req.body.age,
      gender: req.body.gender,
      heart_rate: req.body.heartRate,
      pulse_rate: req.body.pulseRate,
      spo2: req.body.spo2,
      temp_celsius: req.body.temperature?.celsius,
      temp_fahrenheit: req.body.temperature?.fahrenheit,
      bp_systolic: req.body.bloodPressure?.systolic,
      bp_diastolic: req.body.bloodPressure?.diastolic,
      last_updated: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    patientDB.query(
      'UPDATE patients SET ? WHERE id = ?',
      [updateData, patientId],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Update failed' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Patient not found' });

        const changes = [];

        // mapping of db field -> display name
        const fieldMappings = {
          name: 'Name',
          age: 'Age',
          gender: 'Gender',
          heart_rate: 'Heart Rate',
          pulse_rate: 'Pulse Rate',
          spo2: 'SpO2',
          temp_celsius: 'Temperature (C)',
          temp_fahrenheit: 'Temperature (F)',
          bp_systolic: 'BP Systolic',
          bp_diastolic: 'BP Diastolic'
        };

        // compare old vs new for each field
        for (const field in fieldMappings) {
          const oldValue = oldPatient[field];
          const newValue = updateData[field];

          if (newValue !== undefined && oldValue !== newValue) {
            changes.push({
              field: fieldMappings[field],
              old: oldValue,
              new: newValue
            });

            // log immediately
            logPatientUpdate(userId, userName, patientId, fieldMappings[field], oldValue, newValue);
          }
        }

        res.json({ success: true, changes: changes.length });
      }
    );
  });
});

// GET /api/audit-logs
app.get('/api/audit-logs', (req, res) => {
    const sql = `
        SELECT
            a.user_id      AS userId,
            a.user_name    AS userName,
            a.patient_id   AS patientId,
            COALESCE(p.name, a.patient_id) AS patientName,
            a.action,
            a.field,
            a.old_value    AS oldValue,
            a.new_value    AS newValue,
            DATE_FORMAT(a.timestamp, '%m/%d/%y') AS date,
            DATE_FORMAT(a.timestamp, '%H:%i')     AS time
        FROM audit_logs a
        LEFT JOIN patients p ON a.patient_id = p.id
        ORDER BY a.timestamp DESC
        LIMIT 1000
    `;

    patientDB.query(sql, (err, results) => {
        if (err) {
            console.error('Database error in /api/audit-logs:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }

        // Group rows that belong to the same logical change by (user, patient, date, time)
        const grouped = results.reduce((acc, row) => {
            const key = `${row.userId}||${row.patientId}||${row.date}||${row.time}`;
            if (!acc[key]) {
                acc[key] = {
                    userId: row.userId,
                    userName: row.userName,
                    patientId: row.patientId,
                    patientName: row.patientName,
                    date: row.date,
                    time: row.time,
                    edits: []
                };
            }
            acc[key].edits.push({
                field: row.field,
                from: row.oldValue,
                to: row.newValue
            });
            return acc;
        }, {});

        const payload = Object.values(grouped);
        return res.json(payload);
    });
});

// Start server
const PORT = 3333;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});