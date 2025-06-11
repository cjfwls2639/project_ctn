// server.js (Node.js Backend)

// 환경 변수 로드 (가장 먼저 위치해야 합니다.)
const dotenv = require('dotenv');
dotenv.config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const mysql = require('mysql2/promise'); // Promise 기반 MySQL 드라이버 사용
const { OAuth2Client } = require('google-auth-library'); // Google ID 토큰 검증용
const jwt = require('jsonwebtoken'); // JWT 토큰 생성 및 검증용

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- Helper Functions (나중에 별도 모듈로 분리 가능) ---
// 활동 로그 기록 함수 (예시)
const logActivity = async (logId, userId, projectId, taskId, actionType, details) => {
  const sql =
    "INSERT INTO activity_logs ( user_id, project_id, task_id, action_type, details) VALUES (?, ?, ?, ?, ?, ?)";
// Google OAuth2 클라이언트 설정
// .env 파일에 GOOGLE_CLIENT_ID 설정 (예: 943180922128-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// JWT 비밀 키 설정
// .env 파일에 JWT_SECRET 설정 (예: YOUR_VERY_STRONG_AND_RANDOM_SECRET_KEY)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// MySQL 데이터베이스 연결 설정
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// MySQL Connection Pool 생성
let pool; // db 대신 pool 변수 사용

// 데이터베이스 연결 풀 초기화 함수
async function initializeDBPool() {
  try {
    pool = mysql.createPool(dbConfig);
    await pool.getConnection(); // 연결 테스트
    console.log('MySQL database connection pool initialized successfully!');
  } catch (error) {
    console.error('Error initializing MySQL database connection pool:', error.message);
    process.exit(1); // 데이터베이스 연결 실패 시 애플리케이션 종료
  }
}

// 사용자 테이블 및 기타 테이블이 없으면 생성하는 함수 (스키마 반영)
async function createTables() {
  try {
    // 1. users 테이블 생성 (Google 로그인 컬럼 추가, VARCHAR 길이 확장)
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE, /* 길이 10 -> 50으로 확장 */
        email VARCHAR(255) NOT NULL UNIQUE, /* 길이 30 -> 255로 확장 */
        password VARCHAR(255), /* Google 로그인 시에는 null 허용 */
        googleId VARCHAR(255) UNIQUE, /* Google 로그인용: 스키마에 추가 */
        name VARCHAR(255),            /* Google 로그인용: 스키마에 추가 */
        profilePic VARCHAR(255),      /* Google 로그인용: 스키마에 추가 */
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.execute(createUsersTableQuery);
    console.log('Table "users" checked/created.');

    // 2. admins 테이블 생성
    const createAdminsTableQuery = `
      CREATE TABLE IF NOT EXISTS admins (
        admin_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      );
    `;
    await pool.execute(createAdminsTableQuery);
    console.log('Table "admins" checked/created.');

    // 3. projects 테이블 생성 (컬럼명 스키마에 맞춤)
    const createProjectsTableQuery = `
      CREATE TABLE IF NOT EXISTS projects (
        project_id INT AUTO_INCREMENT PRIMARY KEY,
        project_name VARCHAR(20) NOT NULL,
        content VARCHAR(100),
        created_by INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(user_id)
      );
    `;
    await pool.execute(createProjectsTableQuery);
    console.log('Table "projects" checked/created.');

    // 4. project_members 테이블 생성
    const createProjectMembersTableQuery = `
      CREATE TABLE IF NOT EXISTS project_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        user_id INT NOT NULL,
        role_in_project VARCHAR(50) NOT NULL DEFAULT 'member',
        FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `;
    await pool.execute(createProjectMembersTableQuery);
    console.log('Table "project_members" checked/created.');

    // 5. tasks 테이블 생성 (컬럼명 스키마에 맞춤, created_by_user_id 추가)
    const createTasksTableQuery = `
      CREATE TABLE IF NOT EXISTS tasks (
        task_id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        title VARCHAR(20) NOT NULL,
        content VARCHAR(100), /* 스키마에 맞춤: description -> content */
        due_date DATE,
        status ENUM('todo', 'doing', 'done') DEFAULT 'todo',
        created_by_user_id INT NOT NULL, /* tasks 스키마에 추가: 누가 업무를 만들었는지 */
        assigned_to_user_id INT, /* 기존 API 라우트에 맞춰 다시 추가 */
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(project_id),
        FOREIGN KEY (created_by_user_id) REFERENCES users(user_id), /* created_by_user_id 참조 추가 */
        FOREIGN KEY (assigned_to_user_id) REFERENCES users(user_id) ON DELETE SET NULL /* assigned_to_user_id 참조 추가 */
      );
    `;
    await pool.execute(createTasksTableQuery);
    console.log('Table "tasks" checked/created.');

    // 6. task_assignees 테이블 생성
    const createTaskAssigneesTableQuery = `
      CREATE TABLE IF NOT EXISTS task_assignees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `;
    await pool.execute(createTaskAssigneesTableQuery);
    console.log('Table "task_assignees" checked/created.');

    // 7. posts 테이블 생성
    const createPostsTableQuery = `
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `;
    await pool.execute(createPostsTableQuery);
    console.log('Table "posts" checked/created.');

    // 8. comments 테이블 생성 (comment_id PRIMARY KEY)
    const createCommentsTableQuery = `
      CREATE TABLE IF NOT EXISTS comments (
        comment_id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        content VARCHAR(30) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE, /* ON DELETE CASCADE 추가 */
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE /* ON DELETE CASCADE 추가 */
      );
    `;
    await pool.execute(createCommentsTableQuery);
    console.log('Table "comments" checked/created.');

    // 9. activity_logs 테이블 생성 (behavior 및 details 컬럼)
    const createActivityLogsTableQuery = `
      CREATE TABLE IF NOT EXISTS activity_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT, /* 스키마에는 NOT NULL이지만, project 관련 로그는 task_id가 없을 수 있으므로 NULL 허용 */
        project_id INT, /* project_id 추가, NULL 허용 */
        user_id INT NOT NULL,
        behavior VARCHAR(100) NOT NULL, /* 스키마에 맞춤: action_type -> behavior */
        details TEXT, /* 스키마에 추가: JSON 형태로 상세 정보 저장 */
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE SET NULL, /* 업무 삭제 시 NULL */
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE SET NULL /* 프로젝트 삭제 시 NULL */
      );
    `;
    await pool.execute(createActivityLogsTableQuery);
    console.log('Table "activity_logs" checked/created.');

  } catch (error) {
    console.error('Error creating tables:', error.message);
  }
}

// --- Helper Functions ---
// 활동 로그 기록 함수 (스키마 반영)
const logActivity = async (userId, projectId, taskId, behavior, details) => {
  const sql =
    "INSERT INTO activity_logs (user_id, project_id, task_id, behavior, details) VALUES (?, ?, ?, ?, ?)";
  try {
    const connection = await pool.getConnection();
    await connection
      .execute(sql, [
        userId,
        projectId,
        taskId,
        behavior, // action_type -> behavior
        JSON.stringify(details),
      ]);
    const log_id = result.insertId;
    console.log(`Activity logged: ${actionType} (log_id: ${log_id})`);

  } catch (err) {
    console.error("Error logging activity:", err);
  }
};


// --- JWT 토큰 검증 미들웨어 ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '인증 토큰이 없습니다.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT 토큰 검증 실패:', err.message);
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
    // JWT 페이로드에 user_id가 들어있다고 가정
    req.user = user;
    next();
  });
};


// --- 1. 사용자 인증 API (Users) ---

// 회원가입 (Register) - 스키마에 맞게 컬럼명 및 반환값 수정
app.post("/api/register", async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res
      .status(400)
      .json({ error: "사용자 이름, 비밀번호, 이메일을 모두 입력해주세요." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql =
      "INSERT INTO users (username, password, email) VALUES (?, ?, ?)";
    
    // db.query 대신 pool.execute 사용
    const [result] = await pool.execute(sql, [username, hashedPassword, email]);
    
    // 회원가입 성공 시 JWT 토큰 발행 (user_id 사용)
    const token = jwt.sign({ user_id: result.insertId, username: username, email: email }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ message: "회원가입 성공!", user: { user_id: result.insertId, username: username, email: email }, token });
  } catch (err) {
    console.error("Error registering user:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "이미 존재하는 사용자 이름 또는 이메일입니다." });
    }
    res.status(500).json({ error: "회원가입 중 오류가 발생했습니다." });
  }
});

// 로그인 (Login) - 스키마에 맞게 컬럼명 및 반환값 수정
app.post("/api/login", async (req, res) => { // async 추가
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "사용자 이름과 비밀번호를 입력해주세요." });
  }
  
  // user_id 컬럼 사용
  const sql = "SELECT user_id, username, password, email FROM users WHERE username = ?";
  try {
    // db.query 대신 pool.execute 사용
    const [results] = await pool.execute(sql, [username]);

    if (results.length === 0) {
      return res.status(401).json({ error: "사용자를 찾을 수 없습니다." });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "비밀번호가 일치하지 않습니다." });
    }

    // 로그인 성공 시 JWT 토큰 발행 (user_id 사용)
    const token = jwt.sign({ user_id: user.user_id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      message: "로그인 성공!",
      user: { user_id: user.user_id, username: user.username, email: user.email }, // 클라이언트에게 보낼 사용자 정보 (user_id 사용)
      token,
    });
  } catch (err) {
    console.error("Error finding user:", err);
    res.status(500).json({ error: "로그인 중 오류가 발생했습니다." });
  }
});

// 특정 사용자 정보 조회 (READ) - authenticateToken 미들웨어 추가 및 Promise 기반으로 변경
app.get("/api/users/:id", authenticateToken, async (req, res) => {
  const userId = req.params.id; // URL 파라미터로 넘어온 ID
  const authUserId = req.user.user_id; // JWT 토큰에서 추출된 ID

  // 요청된 ID와 JWT 토큰의 ID가 일치하는지 확인 (보안 강화)
  if (parseInt(userId) !== authUserId) {
    return res.status(403).json({ error: "다른 사용자의 정보를 조회할 권한이 없습니다." });
  }

  const sql =
    "SELECT user_id, username, email, created_at FROM users WHERE user_id = ?";

  try {
    const [results] = await pool.execute(sql, [userId]); // db.query 대신 pool.execute 사용

    if (results.length === 0) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    res.json(results[0]);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "사용자 정보 조회 중 오류가 발생했습니다." });
  }
});

// --- Google 로그인 라우트 (스키마 반영) ---
app.post('/auth/google', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'ID 토큰이 제공되지 않았습니다.' });
  }

  try {
    // Google ID 토큰 검증
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    // user_id는 자동 생성, googleId, email, name, profilePic 사용
    const { sub: googleId, email, name, picture: profilePic } = payload;

    // 데이터베이스에서 Google ID로 사용자 찾기 (googleId 컬럼 사용)
    const [rows] = await pool.execute('SELECT * FROM users WHERE googleId = ?', [googleId]);
    let user = rows[0];

    if (!user) {
      // 새로운 사용자라면 DB에 저장
      // username 필드에는 Google 이메일을 사용하거나, 별도의 논리를 추가할 수 있습니다.
      // 여기서는 Google 이메일을 username으로 임시 사용합니다.
      const [insertResult] = await pool.execute(
        'INSERT INTO users (googleId, email, name, profilePic, username) VALUES (?, ?, ?, ?, ?)',
        [googleId, email, name, profilePic, email] // username도 email로 초기화
      );
      user = { user_id: insertResult.insertId, googleId, email, name, profilePic, username: email };
      console.log('New Google user registered:', user.email);
    } else {
      console.log('Existing Google user logged in:', user.email);
      // 기존 사용자라면 이름이나 프로필 사진이 업데이트되었을 수 있으므로 업데이트
      await pool.execute(
        'UPDATE users SET name = ?, profilePic = ? WHERE user_id = ?', // user_id 사용
        [name, profilePic, user.user_id]
      );
      user = { ...user, name, profilePic }; // 업데이트된 정보 반영
    }

    // JWT 토큰 생성 (클라이언트에게 전송) - user_id 사용
    const token = jwt.sign({ user_id: user.user_id, googleId: user.googleId, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({
      message: 'Google 로그인 성공',
      user: { user_id: user.user_id, googleId: user.googleId, name: user.name, email: user.email, profilePic: user.profilePic }, // 클라이언트에게 보낼 사용자 정보 (user_id 사용)
      token,
    });
  } catch (error) {
    console.error('Google ID 토큰 검증 실패 또는 DB 오류:', error.message);
    res.status(401).json({ message: '인증 실패' });
  }
});


// --- 보호된 API 엔드포인트 예시 ---
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: `환영합니다, ${req.user.email}! 보호된 데이터에 접근했습니다.`, user: req.user });
});

// --- 1.2 사용자 프로필 조회 API (인증된 사용자 본인의 정보) - 스키마 반영 ---
// 기존 /api/users/:id 라우트와 유사하나, JWT를 통해 사용자 본인의 정보를 가져옴
app.get("/api/profile", authenticateToken, async (req, res) => {
  const userId = req.user.user_id; // JWT 토큰에서 user_id를 가져옴

  try {
    const sql = `
      SELECT user_id, username, email, googleId, name, profilePic, created_at
      FROM users
      WHERE user_id = ?
    `;
    const [results] = await pool.execute(sql, [userId]);

    if (results.length === 0) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    // 민감한 정보(비밀번호)는 제외하고 전송
    const userProfile = results[0];
    delete userProfile.password; // 비밀번호 필드가 있다면 제거

    res.json(userProfile);
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ error: "프로필 정보를 불러오는 중 오류가 발생했습니다." });
  }
});


// --- 2. 프로젝트 API (Projects) - 스키마 반영 ---

// 2.1. 새로운 프로젝트 생성 (CREATE) - 스키마 컬럼명 및 created_by 사용
app.post("/api/projects", authenticateToken, async (req, res) => { // authenticateToken 미들웨어 추가
  const { project_name, content } = req.body; // 스키마에 맞춤
  const created_by = req.user.user_id; // JWT 토큰에서 user_id를 가져옴

  if (!project_name || !created_by) {
    return res
      .status(400)
      .json({ error: "프로젝트 이름과 생성자 ID는 필수입니다." });
  }

  const connection = await pool.getConnection(); // db.promise() 대신 pool.getConnection()
  try {
    await connection.beginTransaction();

    // 1. projects 테이블에 프로젝트 생성 (스키마 컬럼명 사용)
    const projectSql =
      "INSERT INTO projects (project_name, content, created_by) VALUES (?, ?, ?)";
    const [projectResult] = await connection.execute(projectSql, [ // connection.query 대신 connection.execute
      project_name,
      content,
      created_by,
    ]);
    const projectId = projectResult.insertId;

    // 2. project_members 테이블에 생성자를 'manager'로 추가 (user_id 사용)
    const memberSql =
      "INSERT INTO project_members (project_id, user_id, role_in_project) VALUES (?, ?, ?)";
    await connection.execute(memberSql, [projectId, created_by, "manager"]); // connection.query 대신 connection.execute

    // 3. 활동 로그 기록 (behavior, user_id 사용)
    await logActivity(created_by, projectId, null, "PROJECT_CREATED", {
      projectName: project_name,
    });

    await connection.commit();
    res
      .status(201)
      .json({
        message: "프로젝트가 성공적으로 생성되었습니다.",
        project_id: projectId, // project_id 반환
      });
  } catch (err) {
    await connection.rollback();
    console.error("Error creating project:", err);
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "존재하지 않는 생성자 ID입니다." });
    }
    res.status(500).json({ error: "프로젝트 생성 중 오류가 발생했습니다." });
  } finally {
    connection.release();
  }
});

// 2.2. 특정 사용자가 참여중인 모든 프로젝트 목록 가져오기 (READ ALL FOR USER) - 스키마 반영
app.get("/api/projects", authenticateToken, async (req, res) => { // authenticateToken 미들웨어 추가, async 추가
  const userId = req.user.user_id; // JWT 토큰에서 user_id를 가져옴
  
  const sql = `
        SELECT p.project_id, p.project_name, p.content, p.created_by, p.created_at,
               u.username as owner_name, pm.role_in_project
        FROM projects p
        JOIN users u ON p.created_by = u.user_id
        JOIN project_members pm ON p.project_id = pm.project_id
        WHERE pm.user_id = ?
        ORDER BY p.created_at DESC
    `;
  try {
    const [results] = await pool.query(sql, [userId]); // db.query 대신 pool.query 사용
    res.json(results);
  } catch (err) {
    console.error("Error fetching projects:", err);
    return res
      .status(500)
      .json({ error: "프로젝트 목록을 불러오는 중 오류가 발생했습니다." });
  }
});

// 2.3. 특정 프로젝트 상세 정보 가져오기 (READ ONE) - 스키마 반영
app.get("/api/projects/:projectId", authenticateToken, async (req, res) => { // projectId로 변경, authenticateToken 미들웨어 추가
  const { projectId } = req.params;

  try {
    const [projectPromise, membersPromise] = await Promise.all([
      pool // db.promise() 대신 pool 사용
        .query(
          "SELECT p.project_id, p.project_name, p.content, p.created_by, p.created_at, u.username as owner_name FROM projects p JOIN users u ON p.created_by = u.user_id WHERE p.project_id = ?", // owner_id -> created_by
          [projectId]
        ),
      pool // db.promise() 대신 pool 사용
        .query(
          "SELECT u.user_id, u.username, u.email, pm.role_in_project FROM project_members pm JOIN users u ON pm.user_id = u.user_id WHERE pm.project_id = ?",
          [projectId]
        ),
    ]);

    const [projectResult] = projectPromise;
    const [membersResult] = membersPromise;

    if (projectResult.length === 0) {
      return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
    }

    res.json({
      project: projectResult[0],
      members: membersResult,
    });
  } catch (err) {
    console.error("Error fetching project details:", err);
    res
      .status(500)
      .json({ error: "프로젝트 상세 정보를 불러오는 중 오류가 발생했습니다." });
  }
});

// 2.4. 프로젝트 정보 수정 (UPDATE) - 스키마 컬럼명 사용, created_by 검증
app.put("/api/projects/:projectId", authenticateToken, async (req, res) => { // projectId로 변경, authenticateToken 미들웨어 추가
  const { projectId } = req.params;
  const { project_name, content } = req.body; // 스키마에 맞춤
  const userId = req.user.user_id; // JWT 토큰에서 user_id를 가져옴

  if (!project_name) {
    return res.status(400).json({ error: "프로젝트 이름은 필수입니다." });
  }

  try {
    // 프로젝트 생성자 또는 매니저만 수정 가능하도록 검증 (created_by 사용)
    const [projectCheck] = await pool.execute( // db.execute 대신 pool.execute
      "SELECT created_by FROM projects WHERE project_id = ?",
      [projectId]
    );

    if (projectCheck.length === 0) {
      return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
    }

    const [members] = await pool.execute( // db.execute 대신 pool.execute
      "SELECT role_in_project FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, userId]
    );

    // 프로젝트 생성자이거나 프로젝트의 매니저 권한이 있어야 수정 가능
    if (projectCheck[0].created_by !== userId && (members.length === 0 || (members[0].role_in_project !== 'manager' && members[0].role_in_project !== 'owner'))) {
      return res.status(403).json({ message: "프로젝트를 수정할 권한이 없습니다." });
    }

    const sql = "UPDATE projects SET project_name = ?, content = ? WHERE project_id = ?"; // 스키마에 맞춤
    const [result] = await pool.execute(sql, [project_name, content, projectId]); // db.query 대신 pool.execute

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "프로젝트를 찾을 수 없거나 변경 사항이 없습니다." });
    }
    res.json({ message: "프로젝트가 성공적으로 수정되었습니다." });
  } catch (err) {
    console.error("Error updating project:", err);
    res
      .status(500)
      .json({ error: "프로젝트 수정 중 오류가 발생했습니다." });
  }
});

// 2.5. 프로젝트 삭제 (DELETE) - created_by 검증
app.delete("/api/projects/:projectId", authenticateToken, async (req, res) => { // projectId로 변경, authenticateToken 미들웨어 추가
  const { projectId } = req.params;
  const userId = req.user.user_id; // JWT 토큰에서 user_id를 가져옴

  try {
    // 프로젝트 생성자만 삭제 가능하도록 검증 (created_by 사용)
    const [project] = await pool.execute( // db.execute 대신 pool.execute
      "SELECT created_by FROM projects WHERE project_id = ?",
      [projectId]
    );

    if (project.length === 0) {
      return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
    }
    if (project[0].created_by !== userId) {
      return res.status(403).json({ message: "프로젝트를 삭제할 권한이 없습니다." });
    }

    const sql = "DELETE FROM projects WHERE project_id = ?";
    const [result] = await pool.execute(sql, [projectId]); // db.execute 대신 pool.execute

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
    }
    res.json({ message: "프로젝트가 성공적으로 삭제되었습니다." });
  } catch (err) {
    console.error("Error deleting project:", err);
    res
      .status(500)
      .json({ error: "프로젝트 삭제 중 오류가 발생했습니다." });
  }
});


// --- 3. 업무 API (Tasks) ---

// 3.1. 특정 프로젝트의 모든 업무 가져오기 (READ ALL FROM PROJECT) - 스키마 반영
app.get("/api/projects/:projectId/tasks", authenticateToken, async (req, res) => { // authenticateToken 미들웨어 추가, async 추가
  const { projectId } = req.params;
  // task_assignees 테이블과 JOIN하여 assignees 정보 가져옴
  const sql = `
        SELECT
            t.task_id,
            t.project_id,
            t.title,
            t.content, /* 스키마에 맞춤 */
            t.due_date,
            t.status,
            t.created_by_user_id, /* 추가된 컬럼 */
            t.created_at,
            creator.username AS created_by_username,
            GROUP_CONCAT(DISTINCT assignee.username ORDER BY assignee.username SEPARATOR ', ') AS assigned_users_names,
            JSON_ARRAYAGG(DISTINCT JSON_OBJECT('user_id', assignee.user_id, 'username', assignee.username)) AS assigned_users_details
        FROM tasks t
        JOIN users creator ON t.created_by_user_id = creator.user_id
        LEFT JOIN task_assignees ta ON t.task_id = ta.task_id
        LEFT JOIN users assignee ON ta.user_id = assignee.user_id
        WHERE t.project_id = ?
        GROUP BY t.task_id
        ORDER BY t.created_at DESC
    `;
  try {
    const [results] = await pool.query(sql, [projectId]); // db.query 대신 pool.query
    // assigned_users_details JSON 파싱 (DB 드라이버에 따라 자동 파싱될 수도 있음)
    const parsedResults = results.map(row => ({
      ...row,
      assigned_users_details: row.assigned_users_details ? JSON.parse(row.assigned_users_details) : [],
    }));
    res.json(parsedResults);
  } catch (err) {
    console.error(`Error fetching tasks for project ${projectId}:`, err);
    return res
      .status(500)
      .json({ error: "업무 목록을 불러오는 중 오류가 발생했습니다." });
  }
});

// 3.2. 새로운 업무 생성 (CREATE)
app.post("/api/projects/:projectId/tasks", authenticateToken, async (req, res) => { // authenticateToken 미들웨어 추가, async 추가
  const { projectId } = req.params;
  const {
    title,
    content,
    status,
    due_date,
    assigned_to_user_id,
    assignees_ids, // 새로 추가: 업무 배정될 사용자들의 user_id 배열
  } = req.body;
  const created_by_user_id = req.user.user_id; // JWT 토큰에서 user_id를 가져옴

  if (!title || !created_by_user_id) {
    return res
      .status(400)
      .json({ error: "업무 제목과 생성자 ID는 필수입니다." });
  }

  const connection = await pool.getConnection(); // db.promise() 대신 pool.getConnection()
  try {
    await connection.beginTransaction();

    // 1. tasks 테이블에 업무 생성
    const taskSql = `
        INSERT INTO tasks
        (project_id, title, content, status, due_date, assigned_to_user_id, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await connection.execute( // db.query 대신 connection.execute
      taskSql,
      [
        projectId,
        title,
        content,
        status || "todo", // 기본값 'todo'
        due_date,
        assigned_to_user_id,
        created_by_user_id,
      ]
    );
    const newTaskId = result.insertId;

    // 2. task_assignees 테이블에 업무 배정 (assignees_ids가 있다면)
    if (assignees_ids && assignees_ids.length > 0) {
      const assigneeValues = assignees_ids.map(userId => [newTaskId, userId]);
      const assigneeSql = "INSERT INTO task_assignees (task_id, user_id) VALUES ?";
      await connection.query(assigneeSql, [assigneeValues]); // connection.query 사용 (벌크 인서트)
    } else if (assigned_to_user_id) { // assignees_ids가 없고 assigned_to_user_id가 있다면
      // 단일 담당자도 task_assignees에 추가 (일관성 유지)
      await connection.execute("INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)", [newTaskId, assigned_to_user_id]);
    }

    // 3. 활동 로그 기록
    await logActivity(created_by_user_id, projectId, newTaskId, "TASK_CREATED", {
      taskTitle: title,
    });

    await connection.commit();
    res
      .status(201)
      .json({ message: "업무가 성공적으로 생성되었습니다.", task_id: newTaskId }); // task_id 반환
  } catch (err) {
    await connection.rollback();
    console.error("Error creating task:", err);
    res
      .status(500)
      .json({ error: "업무 생성 중 오류가 발생했습니다." });
  } finally {
    connection.release();
  }
});

/**
 * 특정 업무 상세 정보 가져오기 (담당자 및 댓글 목록 포함)
 * GET /api/tasks/:taskId
 */
app.get("/api/tasks/:taskId", authenticateToken, async (req, res) => { // authenticateToken 미들웨어 추가
  // 1. URL 경로에서 특정 업무의 ID를 추출합니다.
  const { taskId } = req.params;

  // 2. 업무 상세, 담당자 목록, 댓글 목록을 한 번에 가져오는 통합 쿼리
  const sql = `
    SELECT
        t.*,
        creator.username AS creator_username,
        -- 담당자 목록을 JSON 배열 형태로 가져옵니다.
        (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT('user_id', u.user_id, 'username', u.username)
            )
            FROM task_assignees ta
            JOIN users u ON ta.user_id = u.user_id
            WHERE ta.task_id = t.task_id
        ) AS assignees,
        
        -- 댓글 목록을 JSON 배열 형태로 가져옵니다.
        (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'comment_id', c.comment_id,
                    'content', c.content,
                    'author_id', c.user_id,
                    'author_username', u.username,
                    'created_at', c.created_at
                )
            )
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.task_id = t.task_id
            ORDER BY c.created_at ASC
        ) AS comments
    FROM
        tasks AS t
    LEFT JOIN users AS creator ON t.created_by_user_id = creator.user_id
    WHERE
        t.task_id = ?;
  `;

  // 3. 데이터베이스 작업 중 발생할 수 있는 오류를 처리하기 위해 try...catch 사용
  try {
    // 4. 데이터베이스에 쿼리를 실행합니다.
    const [rows] = await pool.query(sql, [taskId]); // db.promise().query 대신 pool.query

    // 5. 쿼리 결과 확인 및 클라이언트에게 응답 전송
    if (rows.length === 0) {
      // 해당 ID의 업무를 찾지 못했을 경우
      return res.status(404).json({ message: "해당 ID의 업무를 찾을 수 없습니다." });
    }
    
    // 6. 성공적으로 조회된 업무 정보를 JSON 형태로 전송합니다.
    res.status(200).json(rows[0]);

  } catch (err) {
    // 7. 데이터베이스 작업 중 에러 발생 시 처리
    console.error("업무 상세 정보 조회 중 에러 발생:", err);
    res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
  }
});

// 3.4. 업무 정보 수정 (UPDATE)
app.put("/api/tasks/:taskId", authenticateToken, async (req, res) => { // taskId로 변경, authenticateToken 미들웨어 추가
  const { taskId } = req.params;
  const { title, content, status, due_date, assigned_to_user_id, assignees_ids } = req.body; // content 사용, assignees_ids 추가
  const userId = req.user.user_id; // JWT 토큰에서 user_id를 가져옴

  if (!title) {
    return res.status(400).json({ error: "업무 제목은 필수입니다." });
  }

  const connection = await pool.getConnection(); // db.promise() 대신 pool.getConnection()
  try {
    await connection.beginTransaction();

    // 업무 수정 권한 검증 (예: 업무 생성자 또는 프로젝트 매니저/오너)
    const [task] = await connection.execute("SELECT created_by_user_id, project_id FROM tasks WHERE task_id = ?", [taskId]);
    if (task.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "업무를 찾을 수 없습니다." });
    }

    const [members] = await connection.execute(
      "SELECT role_in_project FROM project_members WHERE project_id = ? AND user_id = ?",
      [task[0].project_id, userId]
    );

    // 업무 생성자이거나 프로젝트의 매니저 또는 오너 권한이 있어야 수정 가능
    if (task[0].created_by_user_id !== userId && (members.length === 0 || (members[0].role_in_project !== 'manager' && members[0].role_in_project !== 'owner'))) {
      await connection.rollback();
      return res.status(403).json({ message: "업무를 수정할 권한이 없습니다." });
    }

    // 1. tasks 테이블 업데이트
    const taskUpdateSql = `
        UPDATE tasks SET
        title = ?, content = ?, status = ?, due_date = ?, assigned_to_user_id = ?
        WHERE task_id = ?
    `;
    const [result] = await connection.execute( // db.query 대신 connection.execute
      taskUpdateSql,
      [title, content, status, due_date, assigned_to_user_id, taskId]
    );

    // 2. task_assignees 업데이트 (기존 배정된 사용자 모두 삭제 후 새로 추가)
    await connection.execute("DELETE FROM task_assignees WHERE task_id = ?", [taskId]);
    if (assignees_ids && assignees_ids.length > 0) {
      const assigneeValues = assignees_ids.map(userId => [taskId, userId]);
      const assigneeInsertSql = "INSERT INTO task_assignees (task_id, user_id) VALUES ?";
      await connection.query(assigneeInsertSql, [assigneeValues]); // connection.query 사용 (벌크 인서트)
    } else if (assigned_to_user_id) { // assignees_ids가 없고 assigned_to_user_id가 있다면
      await connection.execute("INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)", [taskId, assigned_to_user_id]);
    }

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ message: "업무를 찾을 수 없거나 변경 사항이 없습니다." });
    }

    // TODO: 활동 로그 기록 ('TASK_UPDATED', 'TASK_STATUS_UPDATED', 'TASK_ASSIGNEE_CHANGED' 등)
    await connection.commit();
    res.json({ message: "업무가 성공적으로 수정되었습니다." });
  } catch (err) {
    await connection.rollback();
    console.error("Error updating task:", err);
    res
      .status(500)
      .json({ error: "업무 수정 중 오류가 발생했습니다." });
  } finally {
    connection.release();
  }
});
/**
 * 3.5. 업무 삭제 (DELETE) - 관리자 권한 확인 로직 추가
 */
app.delete("/api/tasks/:taskId", authenticateToken, async (req, res) => { // taskId로 변경, authenticateToken 미들웨어 추가
  const { taskId } = req.params; // 삭제할 업무 ID
  const userId = req.user.user_id; // JWT 토큰에서 사용자 ID를 가져옴

  const connection = await pool.getConnection(); // db.promise() 대신 pool.getConnection()
  try {
    await connection.beginTransaction();

    // 1. [권한 검사] 먼저 사용자가 해당 업무의 프로젝트에서 'manager' 역할을 가졌는지 확인
    const [authResults] = await connection.execute( // db.query 대신 connection.execute
      `SELECT pm.role_in_project
       FROM tasks AS t
       JOIN project_members AS pm ON t.project_id = pm.project_id
       WHERE t.task_id = ? AND pm.user_id = ?;`,
      [taskId, userId]
    );

    if (authResults.length === 0 || (authResults[0].role_in_project !== 'manager' && authResults[0].role_in_project !== 'owner')) { // owner도 추가
      await connection.rollback();
      return res.status(403).json({ error: "업무를 삭제할 권한이 없습니다. (관리자 전용)" });
    }

    // 2. [삭제 실행] 권한이 확인되면, 실제 업무를 삭제
    const [deleteResult] = await connection.execute("DELETE FROM tasks WHERE task_id = ?", [taskId]); // db.query 대신 connection.execute

    if (deleteResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "해당 업무를 찾을 수 없습니다." });
    }

    // TODO: 활동 로그 기록
    await connection.commit();
    res.json({ message: "업무가 성공적으로 삭제되었습니다." });

  } catch (err) {
    await connection.rollback();
    console.error("Error deleting task:", err);
    res.status(500).json({ error: "업무 삭제 중 오류가 발생했습니다." });
  } finally {
    connection.release();
  }
});

// --- 4. 댓글 API (Comments on Tasks) ---

// 4.1. 특정 업무의 모든 댓글 가져오기
app.get("/api/tasks/:taskId/comments", authenticateToken, async (req, res) => { // authenticateToken 미들웨어 추가, async 추가
  const { taskId } = req.params;
  const sql = `
        SELECT c.comment_id, c.task_id, c.user_id, c.content, c.created_at, u.username
        FROM comments c
        JOIN users u ON c.user_id = u.user_id
        WHERE c.task_id = ?
        ORDER BY c.created_at ASC
    `;
  try {
    const [results] = await pool.query(sql, [taskId]); // db.query 대신 pool.query
    res.json(results);
  } catch (err) {
    console.error(`Error fetching comments for task ${taskId}:`, err);
    return res
      .status(500)
      .json({ error: "댓글을 불러오는 중 오류가 발생했습니다." });
  }
});

// 4.2. 새로운 댓글 작성
app.post("/api/tasks/:taskId/comments", authenticateToken, async (req, res) => { // authenticateToken 미들웨어 추가, async 추가
  const { taskId } = req.params;
  const { content } = req.body;
  const user_id = req.user.user_id; // JWT 토큰에서 user_id를 가져옴

  if (!user_id || !content) {
    return res
      .status(400)
      .json({ error: "사용자 ID와 댓글 내용은 필수입니다." });
  }

  const sql =
    "INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)";
  try {
    const [result] = await pool.execute(sql, [taskId, user_id, content]); // db.query 대신 pool.execute
    const newCommentId = result.insertId;
    res
      .status(201)
      .json({ message: "댓글이 성공적으로 작성되었습니다.", comment_id: newCommentId }); // comment_id 반환
  } catch (err) {
    console.error("Error creating comment:", err);
    res
      .status(500)
      .json({ error: "댓글 작성 중 오류가 발생했습니다." });
  }
});

// --- 5. 포스트 API (Posts) - 스키마 반영 ---
// 게시글 생성
app.post('/api/posts', authenticateToken, async (req, res) => { // authenticateToken 미들웨어 추가
  const { title, content } = req.body;
  const author_id = req.user.user_id; // JWT에서 author_id (user_id) 추출

  if (!title || !content || !author_id) {
    return res.status(400).json({ error: '제목, 내용, 작성자 ID는 필수입니다.' });
  }

  const sql = 'INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)';
  try {
    const [result] = await pool.execute(sql, [title, content, author_id]); // db.execute 대신 pool.execute
    res.status(201).json({ message: '게시글이 성공적으로 생성되었습니다.', id: result.insertId });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: '게시글 생성 중 오류가 발생했습니다.' });
  }
});

// 모든 게시글 조회
app.get('/api/posts', async (req, res) => { // async 추가
  const sql = `
    SELECT p.id, p.title, p.content, p.created_at, u.username AS author_name
    FROM posts p
    JOIN users u ON p.author_id = u.user_id
    ORDER BY p.created_at DESC
  `;
  try {
    const [results] = await pool.execute(sql); // db.execute 대신 pool.execute
    res.json(results);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: '게시글을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 특정 게시글 조회
app.get('/api/posts/:id', async (req, res) => { // async 추가
  const { id } = req.params;
  const sql = `
    SELECT p.id, p.title, p.content, p.created_at, u.username AS author_name
    FROM posts p
    JOIN users u ON p.author_id = u.user_id
    WHERE p.id = ?
  `;
  try {
    const [results] = await pool.execute(sql, [id]); // db.execute 대신 pool.execute
    if (results.length === 0) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }
    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({ error: '게시글을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 게시글 수정
app.put('/api/posts/:id', authenticateToken, async (req, res) => { // authenticateToken 미들웨어 추가
  const { id } = req.params;
  const { title, content } = req.body;
  const userId = req.user.user_id; // JWT에서 user_id 추출

  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용은 필수입니다.' });
  }

  try {
    // 본인 게시글인지 확인
    const [postCheck] = await pool.execute('SELECT author_id FROM posts WHERE id = ?', [id]); // db.execute 대신 pool.execute
    if (postCheck.length === 0) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }
    if (postCheck[0].author_id !== userId) {
      return res.status(403).json({ message: '게시글을 수정할 권한이 없습니다.' });
    }

    const sql = 'UPDATE posts SET title = ?, content = ? WHERE id = ?';
    const [result] = await pool.execute(sql, [title, content, id]); // db.execute 대신 pool.execute

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '게시글을 찾을 수 없거나 변경 사항이 없습니다.' });
    }
    res.json({ message: '게시글이 성공적으로 수정되었습니다.' });
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ error: '게시글 수정 중 오류가 발생했습니다.' });
  }
});

// 게시글 삭제
app.delete('/api/posts/:id', authenticateToken, async (req, res) => { // authenticateToken 미들웨어 추가
  const { id } = req.params;
  const userId = req.user.user_id; // JWT에서 user_id 추출

  try {
    // 본인 게시글인지 확인
    const [postCheck] = await pool.execute('SELECT author_id FROM posts WHERE id = ?', [id]); // db.execute 대신 pool.execute
    if (postCheck.length === 0) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }
    if (postCheck[0].author_id !== userId) {
      return res.status(403).json({ message: '게시글을 삭제할 권한이 없습니다.' });
    }

    const sql = 'DELETE FROM posts WHERE id = ?';
    const [result] = await pool.execute(sql, [id]); // db.execute 대신 pool.execute

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }
    res.json({ message: '게시글이 성공적으로 삭제되었습니다.' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: '게시글 삭제 중 오류가 발생했습니다.' });
  }
});


//6. 알람 불러오기
app.get("/api/tasks/due_date", authenticateToken, async (req, res) => { // authenticateToken 미들웨어 추가, async 추가
  const userId = req.user.user_id; // JWT 토큰에서 user_id를 가져옴

  // due_date가 오늘부터 7일 이내이면서 해당 userId에게 할당된 태스크를 조회합니다.
  const sql = `
    SELECT t.*
    FROM tasks t
    JOIN task_assignees ta ON t.task_id = ta.task_id
    WHERE ta.user_id = ?
      AND t.due_date IS NOT NULL
      AND t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ORDER BY t.due_date ASC;
  `;

  try {
    const [results] = await pool.query(sql, [userId]); // db.query 대신 pool.query
    console.log(sql, userId, results);
    res.json(results);
  } catch (err) {
    console.error("Error fetching tasks due soon:", err);
    return res
      .status(500)
      .json({ error: "알림 목록을 불러오는 중 오류가 발생했습니다." });
  }
});


// 서버 시작 함수
async function startServer() {
  await initializeDBPool(); // DB 풀 초기화
  await createTables(); // 모든 테이블 생성 또는 확인
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer(); // 서버 시작

}