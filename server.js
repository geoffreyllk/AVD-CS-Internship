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

const PORT = 3333;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
