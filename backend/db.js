const mysql = require('mysql2');

const pool = mysql.createPool({
    connectionLimit: 10, // 최대 연결 개수
    host: 'localhost',   // MySQL 서버 주소
    user: 'root',        // MySQL 사용자 이름
    password: '0000', // ✨ 당신의 MySQL 비밀번호로 변경하세요! ✨
    database: 'test' // 사용할 데이터베이스 이름
});

// pool이 에러 발생 시 처리
pool.on('error', (err) => {
    console.error('MySQL Pool Error:', err);
});

module.exports = pool;