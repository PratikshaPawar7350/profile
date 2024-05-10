const express = require('express');
const mysql = require('mysql2'); // Use mysql2 instead of mysql
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
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

function bufferToBase64(buffer) {
    return Buffer.from(buffer).toString('base64');
  }
  
  // Route to fetch syllabus data filtered by standard (standred)
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
  
  // Route to fetch chapters based on selected syllabus ID
  // Route to fetch chapters based on selected syllabus name
  // Route to fetch chapters based on selected syllabus name
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
    
    
  
    // Route to fetch sidebar items for a selected chapter name
  app.get('/sidebaritems', async (req, res) => {
      const { ChapterName } = req.query;
    
      if (!ChapterName) {
        return res.status(400).json({ error: 'Selected chapter name parameter is required' });
      }
    
      try {
        // Define the SQL query to fetch sidebar items for the selected chapter
        const sql = `
          SELECT
            s.sidebarid,
            s.sidebaritem
           
          FROM
            siderbara s
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
    
  
  
    // Route to fetch introduction details based on sidebar item
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
  
  
  // Route to fetch details of a selected sidebar item from the 'basic' table
  // Route to fetch details of a selected sidebar item from the 'basic' table
  app.get('/basicitem', async (req, res) => {
    const { sidebaritem } = req.query;
  
    if (!sidebaritem) {
      return res.status(400).json({ error: 'Sidebar Item parameter is required' });
    }
  
    try {
      // Define the SQL query to fetch details of the selected sidebar item from 'basic' table
      const sql = `
      
      SELECT
      b.basicid,
      b.basic,
      b.cid,
      b.sid,
      b.imageb
    FROM
      basic b
    INNER JOIN
      siderbara s ON b.sid = s.cid
    WHERE
      s.sidebaritem = ?;
    
      `;
  
      // Execute the query with the sidebaritem as parameter
      const selectedBasicItem = await query(sql, [sidebaritem]);
  
      // Map the results to format the response data with imageb in base64 format
      const formattedData = selectedBasicItem.map(item => ({
        basicid: item.basicid,
        basic: item.basic,
        cid: item.cid,
        sid: item.sid,
        // Convert imageb to base64
        imageb: item.imageb ? bufferToBase64(item.imageb) : null
      }));
  
      // Return the selected basic item data as JSON response
      res.json(formattedData);
    } catch (err) {
      console.error('Error fetching selected basic item:', err);
      res.status(500).json({ error: 'Error fetching selected basic item' });
    }
  });
  
  /////////////////////////////////////////////
  
  
  app.get('/profile', async (req, res) => {
    const { studentid } = req.query;
  
    // Check if studentid parameter is provided and valid
    if (!studentid) {
      return res.status(400).json({ error: 'studentid parameter is required' });
    }
  
    try {
      // Define the SQL query to select profile data filtered by studentid
      const sql = 'SELECT pid, fullname, standard, rollnumber, mobile, dob, email, profilephoto,division FROM profile WHERE student_id = ?';
  
      // Execute the query with the studentid parameter using placeholders
      const results = await query(sql, [studentid]);
  
      if (results.length === 0) {
        return res.status(404).json({ error: 'Profile not found for the provided studentid' });
      }
  
      // Extract profile data from the first row (assuming only one profile per studentid)
      const profile = results[0];
      const profileData = {
        pid: profile.pid,
        fullname: profile.fullname,
        standard: profile.standard,
        rollnumber: profile.rollnumber,
        mobile: profile.mobile,
        dob: profile.dob,
        email: profile.email,
        division:profile.division,
        profilephoto: profile.profilephoto ? profile.profilephoto.toString('base64') : null
      };
  
      // Return the profile data as JSON response
      res.json(profileData);
    } catch (err) {
      console.error('Error fetching profile data:', err);
      res.status(500).json({ error: 'Error fetching profile data' });
    }
  });


  app.get('/subject', (req, res) => {
    const subjectId = req.params.id;

    const sql = `SELECT subject.sub_id, subject.sub_name, chapter.ch_id, chapter.chapter_name, point.point_id, point.point_name, point.point_text FROM subject JOIN chapter ON subject.sub_id = chapter.sub_id LEFT JOIN point ON chapter.ch_id = point.ch_id ORDER BY chapter.ch_id, point.point_id`;
  
;

    connection.query(sql, [subjectId], (err, results) => {
        if (err) {
            console.error('Error querying the database:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        if (results.length === 0) {
            res.status(404).send('Subject not found');
            return;
        }

        const subjectData = {
            subject_name: results[0].subject_name,
            chapters: []
        };

        const chaptersMap = new Map();

        results.forEach(row => {
            let chapter;

            if (!chaptersMap.has(row.chapter_name)) {
                chapter = {
                    chapter_name: row.chapter_name,
                    points: []
                };
                chaptersMap.set(row.chapter_name, chapter);
            } else {
                chapter = chaptersMap.get(row.chapter_name);
            }

            if (row.point_name) {
                chapter.points.push({
                    point_name: row.point_name,
                    point_text: row.point_text
                });
            }
        });

        subjectData.chapters = Array.from(chaptersMap.values());

        res.json(subjectData);
    });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
