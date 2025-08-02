const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const filePath = path.join(__dirname, 'patients.json');

app.use(express.static(__dirname)); // serve index.html, etc.
app.use(express.json());

// Load all patients
app.get('/patients.json', (req, res) => {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading file');
    res.send(data);
  });
});

// Update a patient by ID
app.put('/patients/:id', (req, res) => {
  const updatedPatient = req.body;
  const id = req.params.id;

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading file');

    let patients = JSON.parse(data);
    const index = patients.findIndex(p => p.id == id);
    if (index === -1) return res.status(404).send('Patient not found');

    patients[index] = updatedPatient;

    fs.writeFile(filePath, JSON.stringify(patients, null, 2), err => {
      if (err) return res.status(500).send('Error writing file');
      res.send({ success: true });
    });
  });
});

// === MySQL Setup ===
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'avdex2025',
  database: 'hospital_db'
});

db.connect((err) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err.message);
    return;
  }
  console.log('✅ Connected to MySQL');
});

// === GET all patients from MySQL ===
app.get('/mysql/patients', (req, res) => {
  db.query('SELECT * FROM patients', (err, results) => {
    if (err) return res.status(500).send('❌ Error querying database');
    res.json(results);
  });
});

// === PUT (update) patient by ID in MySQL ===
app.put('/mysql/patients/:id', (req, res) => {
  const id = req.params.id;
  const { name, age, diagnosis } = req.body;

  db.query(
    'UPDATE patients SET name = ?, age = ?, diagnosis = ? WHERE id = ?',
    [name, age, diagnosis, id],
    (err, result) => {
      if (err) return res.status(500).send('❌ Error updating patient');
      if (result.affectedRows === 0) return res.status(404).send('Patient not found');
      res.send({ success: true, updated: result.affectedRows });
    }
  );
});

// === MySQL Route to Get Hospital Users ===
app.get('/api/hospital-users', (req, res) => {
  db.query('SELECT hospital_id, access_level FROM hospital_users', (err, results) => {
    if (err) {
      console.error('❌ Query error:', err);  // Log error
      return res.status(500).json({ error: 'Failed to fetch hospital users' });
    }

    console.log('✅ Query successful, results:', results);  // Log data
    res.json(results);
  });
});

const PORT = 3333;
app.listen(PORT, () => {
  console.log('✅ Server running at http://localhost:${PORT}');
});