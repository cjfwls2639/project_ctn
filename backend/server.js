const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());


const db = mysql.createConnection({
  host: 'localhost',        
  user: 'root',           
  password: 'duswp8058!',     
  database: 'todo'         
});


db.connect((err) => {
  if (err) {
    console.error('DB 연결 실패:', err);
  } else {
    console.log('MySQL 연결 성공!');
  }
});


app.get('/api/projects', (req, res) => {
    db.query('SELECT * FROM projects', (err, results) => {
      if (err) {
        return res.status(500).send('쿼리 오류');
      }
      res.json(results);
    });
  });
  
  app.listen(3001, () => {
    console.log('서버 실행 중 → http://localhost:3001');
  });