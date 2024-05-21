// index.js
const express = require('express');
const mysql = require('mysql2');

const app = express();
const port = 3000;

// MySQL connection setup
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'your_username',
  password: 'your_password',
  database: 'mgkv'  // The database where the homework_student table is located
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the MySQL database');
});

// Middleware to parse JSON
app.use(express.json());

// API endpoint to fetch homework by subject name
app.get('/homework/:subject_name', (req, res) => {  // Changed parameter to subject_name
  const subjectName = req.params.subject_name;

  const query = `
    SELECT 
      h.id,
      h.homework_id,
      h.subject_id,
      h.sid,
      h.date_of_submission,
      h.teacher_code,
      h.description,
      h.image
    FROM 
      mgkv.homework_student h
    JOIN 
      colleges.Subject s ON h.subject_id = s.subject_code
    WHERE 
      s.subject_name = ?`;  // Matching subject_name instead of subject_code_prefixed

  connection.query(query, [subjectName], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    res.json(results);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
