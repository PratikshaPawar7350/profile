const express = require('express');
const mysql = require('mysql2'); // Use mysql2 instead of mysql
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// MySQL Connection Pool with proper authPlugins option
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  authPlugins: {
    mysql_clear_password: () => () => Buffer.from(process.env.DB_PASSWORD + '\0')
  }
});

// Custom query function to execute SQL queries
const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
        return;
      }

      connection.query(sql, params, (err, rows) => {
        connection.release();

        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });
};

// Routes

function bufferToBase64(buffer) {
  return Buffer.from(buffer).toString('base64');
}

// Route to fetch syllabus data filtered by standred
app.get('/syllabus', async (req, res) => {
  const { standard } = req.query;

  // Check if standard parameter is provided and valid
  if (!standard) {
    return res.status(400).json({ error: 'Standard parameter is required' });
  }

  try {
    // Define the SQL query to select syllabus data filtered by standard
    const sql = 'SELECT id, syllabusname, image, standred FROM syllabus WHERE standred = ?';

    // Execute the query with the standard parameter
    const results = await query(sql, [standard]);

    // Map the results to format the response data
    const syllabusData = results.map(syllabus => ({
      id: syllabus.id,
      syllabusname: syllabus.syllabusname,
      standred: syllabus.standred,
      image: bufferToBase64(syllabus.image) // Assuming bufferToBase64 is defined
    }));

    // Return the syllabus data as JSON response
    res.json(syllabusData);
    
  } catch (err) {
    console.error('Error fetching syllabus data:', err);
    res.status(500).json({ error: 'Error fetching syllabus data' });
  }
});

app.get('/chapters', async (req, res) => {
  const { syllabusName } = req.query;

  if (!syllabusName) {
    return res.status(400).json({ error: 'Syllabus name parameter is required' });
  }

  try {
    // Define the SQL query to fetch chapters and associated syllabus details
    const sql = `
      SELECT 
        chapter.cid AS chapter_id,
        chapter.chaptername AS chapter_name
     
       
      FROM 
        chapter
      INNER JOIN 
        syllabus ON chapter.sid = syllabus.id
      WHERE 
        syllabus.syllabusname = ?`;

    // Execute the query with the syllabus name as parameter
    const chapters = await query(sql, [syllabusName]);

    // Return the chapters data as JSON response
    res.json(chapters);
  } catch (err) {
    console.error('Error fetching chapters:', err);
    res.status(500).json({ error: 'Error fetching chapters' });
  }
});


app.get('/sidebaritems', async (req, res) => {
  const { ChapterName } = req.query;

  if (!ChapterName) {
    return res.status(400).json({ error: 'Selected chapter name parameter is required' });
  }

  try {
    // Define the SQL query to fetch sidebar items for the selected chapter
    const sql = `
      SELECT
        s.id,
        s.sidebaritem
       
      FROM
        sidebar s
      INNER JOIN
        chapter c ON s.cid = c.cid
      WHERE
        c.chaptername = ?`;

    // Execute the query with the selected chapter name as parameter
    const sidebarItems = await query(sql, [ChapterName]);

    // Return the sidebar items data as JSON response
    res.json(sidebarItems);
  } catch (err) {
    console.error('Error fetching sidebar items:', err);
    res.status(500).json({ error: 'Error fetching sidebar items' });
  }
});



//for introduction
// Route to fetch introduction details based on sidebar item
app.get('/introduction', async (req, res) => {
  const { sidebaritem } = req.query;

  if (!sidebaritem) {
    return res.status(400).json({ error: 'Sidebar Item parameter is required' });
  }

  try {
    // Define the SQL query to fetch introduction details for the specified sidebar item
    const sql = `
      SELECT
        i.Inid,
        i.Introduction,
        i.image,
        i.cid,
        i.sid
      FROM
        introduction i
      INNER JOIN
        siderbara s ON i.cid = s.cid
      WHERE
        s.sidebaritem = ?;
    `;

    // Execute the query with the sidebaritem as parameter
    const selectedSidebarItem = await query(sql, [sidebaritem]);

    // Map the results to format the response data with image in base64 format
    const formattedData = selectedSidebarItem.map(item => ({
      Inid: item.Inid,
      Introduction: item.Introduction,
      cid: item.cid,
      sid: item.sid,
      // Convert image to base64
      image: item.image ? bufferToBase64(item.image) : null
    }));

    // Return the selected sidebar item data as JSON response
    res.json(formattedData);
  } catch (err) {
    console.error('Error fetching selected sidebar item:', err);
    res.status(500).json({ error: 'Error fetching selected sidebar item' });
  }
});

/*app.get('/chapterdetails', async (req, res) => {
  const chapterName = req.query.name;
  const queryStr = `
    SELECT * 
    FROM chapterdetails 
    INNER JOIN chapters ON chapterdetails.subjectname = chapters.name 
    WHERE chapterdetails.subjectname = ?`;

  try {
    const rows = await query(queryStr, [chapterName]);
    res.json(rows);
  } catch (err) {
    console.error('Error executing database query:', err);
    res.status(500).json({ error: 'Error fetching data from the database', details: err.message });
  }
});*/

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
