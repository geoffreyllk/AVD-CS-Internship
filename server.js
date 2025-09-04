// server.js
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
app.use(express.static(__dirname));
app.use(express.json());

// Serve metadata.json
app.get('/metadata.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'metadata.json'));
});

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
  connectionLimit: 10
});

app.post('/api/login', (req, res) => {
  const { hospital_id, password } = req.body;
  if (!hospital_id || !password) {
    return res.status(400).json({ success: false, message: 'Missing credentials' });
  }

  hospitalDB.query(
    'SELECT hospital_id, name, access_level, password FROM hospital_users WHERE hospital_id = ? LIMIT 1',
    [hospital_id],
    (err, results) => {
      if (err) return res.status(500).json({ success: false, message: 'Server error' });
      if (!results || results.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid ID or password' });
      }

      const user = results[0];
      const stored = user.password || '';
      const isBcrypt = stored.startsWith('$2');

      if (isBcrypt) {
        bcrypt.compare(password, stored, (bcryptErr, match) => {
          if (bcryptErr) return res.status(500).json({ success: false, message: 'Server error' });
          if (match) return res.json({ success: true, user });
          return res.status(401).json({ success: false, message: 'Invalid ID or password' });
        });
      } else {
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        if (hash === stored) return res.json({ success: true, user });
        return res.status(401).json({ success: false, message: 'Invalid ID or password' });
      }
    }
  );
});

app.get('/api/patients', (req, res) => {
  patientDB.query('SELECT * FROM patients', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    const formatted = results.map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      heartRate: p.heart_rate,
      pulseRate: p.pulse_rate,
      spo2: p.spo2,
      temperature: { celsius: p.temp_celsius, fahrenheit: p.temp_fahrenheit },
      bloodPressure: { systolic: p.bp_systolic, diastolic: p.bp_diastolic },
      lastUpdated: p.last_updated
    }));

    res.json(formatted);
  });
});

function logPatientUpdate(userId, userName, patientId, field, oldValue, newValue) {
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const query = `
    INSERT INTO audit_logs (user_id, user_name, patient_id, action, field, old_value, new_value, timestamp)
    VALUES (?, ?, ?, 'UPDATE', ?, ?, ?, ?)
  `;
  const values = [userId, userName, patientId, field, oldValue, newValue, timestamp];
  patientDB.query(query, values, (err) => {
    if (err) console.error('Failed to log update:', err);
  });
}

app.put('/api/patients/:id', (req, res) => {
  const patientId = req.params.id;
  const userId = req.headers['x-user-id'] || 'unknown';
  const userName = req.headers['x-user-name'] || 'Unknown User';

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

    patientDB.query('UPDATE patients SET ? WHERE id = ?', [updateData, patientId], (err, result) => {
      if (err) return res.status(500).json({ error: 'Update failed' });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Patient not found' });

      const fieldMappings = {
        name: 'Name', age: 'Age', gender: 'Gender',
        heart_rate: 'Heart Rate', pulse_rate: 'Pulse Rate',
        spo2: 'SpO2', temp_celsius: 'Temperature (C)', temp_fahrenheit: 'Temperature (F)',
        bp_systolic: 'BP Systolic', bp_diastolic: 'BP Diastolic'
      };

      let changes = 0;
      for (const field in fieldMappings) {
        const oldValue = oldPatient[field];
        const newValue = updateData[field];
        if (newValue !== undefined && oldValue !== newValue) {
          changes++;
          logPatientUpdate(userId, userName, patientId, fieldMappings[field], oldValue, newValue);
        }
      }

      res.json({ success: true, changes });
    });
  });
});

app.get('/api/audit-logs', (req, res) => {
  const sql = `
    SELECT
      a.user_id AS userId, a.user_name AS userName,
      a.patient_id AS patientId, COALESCE(p.name, a.patient_id) AS patientName,
      a.field, a.old_value AS oldValue, a.new_value AS newValue,
      DATE_FORMAT(a.timestamp, '%m/%d/%y') AS date,
      DATE_FORMAT(a.timestamp, '%H:%i') AS time
    FROM audit_logs a
    LEFT JOIN patients p ON a.patient_id = p.id
    ORDER BY a.timestamp DESC
    LIMIT 1000
  `;
  patientDB.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    const grouped = results.reduce((acc, row) => {
      const key = `${row.userId}||${row.patientId}||${row.date}||${row.time}`;
      if (!acc[key]) {
        acc[key] = {
          userId: row.userId, userName: row.userName,
          patientId: row.patientId, patientName: row.patientName,
          date: row.date, time: row.time, edits: []
        };
      }
      acc[key].edits.push({ field: row.field, from: row.oldValue, to: row.newValue });
      return acc;
    }, {});
    res.json(Object.values(grouped));
  });
});

app.get('/api/patients/:id/vitals-history', (req, res) => {
  const patientId = req.params.id;
  const fields = ['Heart Rate','Pulse Rate','SpO2','Temperature (C)','Temperature (F)','BP Systolic','BP Diastolic'];
  const sql = `
    SELECT field, new_value AS value, DATE_FORMAT(timestamp, '%d/%m/%Y %H:%i') AS time
    FROM audit_logs
    WHERE patient_id = ? AND field IN (?)
    ORDER BY timestamp ASC
  `;
  patientDB.query(sql, [patientId, fields], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const grouped = results.reduce((acc, row) => {
      if (!acc[row.field]) acc[row.field] = [];
      acc[row.field].push({ time: row.time, value: row.value });
      return acc;
    }, {});
    res.json(grouped);
  });
});

const PORT = 3336;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
