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
    
    app.get('/chaptercontaint', (req, res) => {
      const { chapterName } = req.query;
    
      if (!chapterName) {
        return res.status(400).json({ error: 'Chapter name is required' });
      }
    
      const query = `
        SELECT 
          c.chapter_name,
          p.point_id,
          p.point_name,
          p.point_text,
          p.point_image,
          v.videoname,
          v.video
        FROM 
          Chapter c
          JOIN Point p ON c.ch_id = p.ch_id
          LEFT JOIN videos v ON p.point_id = v.point_id
        WHERE 
          c.chapter_name = ?;
      `;
    
      // Execute the query using the pool
      pool.query(query, [chapterName], (err, results) => {
        if (err) {
          console.error('Error executing MySQL query:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
    
        // Prepare response object with Base64-encoded video content
        const chapterDetails = {
          chapter_name: chapterName,
          points: results.map(row => ({
            point_id: row.point_id,
            point_name: row.point_name,
            point_text: row.point_text,
            point_image: row.point_image ? bufferToBase64(row.point_image) : null,
            videos: row.videoname ? {
              videoname: row.videoname,
              video: row.video ? row.video.toString('base64') : null
            } : null
          }))
        };
    
        res.json(chapterDetails);
      });
    });
    // Function to encode image data to Base64
    
    
  
    // Route to fetch sidebar items for a selected chapter name
 /* app.get('/sidebaritems', async (req, res) => {
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
  
  */
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

  app.post('/feedback', async (req, res) => {
    const { teacher_name, your_name, subject, explanation } = req.body;
  
    if (!teacher_name || !your_name || !subject || !explanation) {
      return res.status(400).json({ error: 'All fields are required' });
    }
  
    try {
      const sql = 'INSERT INTO Feedback (teacher_name, your_name, subject, explanation) VALUES (?, ?, ?, ?)';
      const values = [teacher_name, your_name, subject, explanation];
  
      // Execute the insert query
      const result = await query(sql, values);
  
      if (result.affectedRows > 0) {
        console.log('Feedback inserted successfully');
        res.status(200).json({ success: true, message: 'Feedback added successfully' });
      } else {
        console.log('No rows affected, feedback not inserted');
        res.status(500).json({ success: false, error: 'Failed to insert feedback' });
      }
    } catch (err) {
      console.error('Error inserting feedback:', err);
      res.status(500).json({ success: false, error: 'Failed to insert feedback' });
    }
  });
  
  app.get('/problem', (req, res) => {
    const { chaptername } = req.query;
  
    if (!chaptername) {
      return res.status(400).json({ error: 'Chaptername parameter is required' });
    }
  
    const query = `
      SELECT 
        pr.id, 
        pr.question, 
        pr.option1, 
        pr.option2, 
        pr.option3, 
        pr.option4 
      FROM 
        Problems pr
      JOIN 
        Chapter c ON pr.chapterid = c.ch_id
      WHERE 
        c.chapter_name = ?;
    `;
  
    pool.query(query, [chaptername], (err, results) => {
      if (err) {
        console.error('Error executing MySQL query:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
  
      res.json(results);
    });
  });



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
