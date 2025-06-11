const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const db = require("./db"); // db.js 설정은 기존과 동일하다고 가정합니다.

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- Helper Functions (나중에 별도 모듈로 분리 가능) ---
// 활동 로그 기록 함수 (예시)
const logActivity = async (userId, projectId, taskId, actionType, details) => {
  const sql =
    "INSERT INTO activity_logs (user_id, project_id, task_id, action_type, details) VALUES (?, ?, ?, ?, ?)";
  try {
    await db
      .promise()
      .query(sql, [
        userId,
        projectId,
        taskId,
        actionType,
        JSON.stringify(details),
      ]);
    console.log(`Activity logged: ${actionType}`);
  } catch (err) {
    console.error("Error logging activity:", err);
    // 로깅 실패가 주 로직에 영향을 주지 않도록 에러를 던지지 않음
  }
};

// --- 1. 사용자 인증 API (Users) ---

// 회원가입 (Register) - 스키마에 맞게 컬럼명 수정
app.post("/api/register", async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res
      .status(400)
      .json({ error: "사용자 이름, 비밀번호, 이메일을 모두 입력해주세요." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // 테이블명 'users', 컬럼명 'password' 사용
    const sql =
      "INSERT INTO users (username, password, email) VALUES (?, ?, ?)";
    db.query(sql, [username, hashedPassword, email], (err, result) => {
      if (err) {
        console.error("Error registering user:", err);
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ error: "이미 존재하는 사용자 이름 또는 이메일입니다." });
        }
        return res
          .status(500)
          .json({ error: "회원가입 중 오류가 발생했습니다." });
      }
      res.status(201).json({ message: "회원가입 성공!", id: result.insertId }); // 'user_id' -> 'id'
    });
  } catch (hashError) {
    console.error("Error hashing password:", hashError);
    res.status(500).json({ error: "비밀번호 처리 중 오류가 발생했습니다." });
  }
});

// 로그인 (Login) - 스키마에 맞게 컬럼명 수정
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "사용자 이름과 비밀번호를 입력해주세요." });
  }
  
// 테이블명 'users', 컬럼명 'user_id', 'password' 사용
  const sql =
    "SELECT user_id, username, password FROM users WHERE username = ?";
  db.query(sql, [username], async (err, results) => {
    if (err) {
      console.error("Error finding user:", err);
      return res.status(500).json({ error: "로그인 중 오류가 발생했습니다." });
    }
    if (results.length === 0) {
      return res.status(401).json({ error: "사용자를 찾을 수 없습니다." });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "비밀번호가 일치하지 않습니다." });
    }

    res.json({
      message: "로그인 성공!",
      user_id: user.user_id,
      username: user.username,
    });
  });
});

// 특정 사용자 정보 조회 (READ)
app.get("/api/users/:id", (req, res) => {
  const userId = req.params.id;

  const sql =
    "SELECT user_id, username, email, created_at FROM users WHERE user_id = ?";

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching user:", err);
      return res
        .status(500)
        .json({ error: "사용자 정보 조회 중 오류가 발생했습니다." });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    res.json(results[0]);
  });
});

// --- 2. 프로젝트 API (Projects) ---

// 2.1. 새로운 프로젝트 생성 (CREATE)
app.post("/api/projects", async (req, res) => {
  const { name, content, created_by } = req.body;
  if (!name || !created_by) {
    return res
      .status(400)
      .json({ error: "프로젝트 이름을 입력 해주세요." });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 1. projects 테이블에 프로젝트 생성
    const projectSql =
      "INSERT INTO projects (name, content, created_by) VALUES (?, ?, ?)";
    const [projectResult] = await connection.query(projectSql, [
      name,
      content,
      created_by,
    ]);
    const projectId = projectResult.insertId;

    // 2. project_members 테이블에 소유자를 'manager'로 추가
    const memberSql =
      "INSERT INTO project_members (project_id, user_id, role_in_project) VALUES (?, ?, ?)";
    await connection.query(memberSql, [projectId, created_by, "manager"]);

    // 3. 활동 로그 기록
    await logActivity(created_by, projectId, null, "PROJECT_CREATED", {
      projectName: name,
    });

    await connection.commit();
    res
      .status(201)
      .json({
        message: "프로젝트가 성공적으로 생성되었습니다.",
        id: projectId,
      });
  } catch (err) {
    await connection.rollback();
    console.error("Error creating project:", err);
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "존재하지 않는 소유자 ID입니다." });
    }
    res.status(500).json({ error: "프로젝트 생성 중 오류가 발생했습니다." });
  } finally {
    connection.release();
  }
});

// 2.2. 특정 사용자가 참여중인 모든 프로젝트 목록 가져오기 (READ ALL FOR USER)
app.get("/api/projects", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res
      .status(400)
      .json({ error: "사용자 ID(userId) 쿼리 파라미터가 필요합니다." });
  }
  // project_members 테이블과 JOIN하여 해당 사용자가 속한 프로젝트만 조회
  // p = projects 테이블, u = users 테이블, pm= project_members 테이블
  // owner_name = u.username
  const sql = `
        SELECT p.*, u.username as owner_name, pm.role_in_project
        FROM projects as p
        JOIN users as u ON p.created_by = u.user_id
        JOIN project_members as pm ON p.project_id = pm.project_id
        WHERE pm.user_id = ?
        ORDER BY p.created_at DESC
    `;
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching projects:", err);
      return res
        .status(500)
        .json({ error: "프로젝트 목록을 불러오는 중 오류가 발생했습니다." });
    }
    res.json(results);
  });
});

// 2.3. 특정 프로젝트 상세 정보 가져오기 (READ ONE)
app.get("/api/projects/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Promise.all을 사용하여 프로젝트 정보와 멤버 목록을 병렬로 조회
    const [projectPromise, membersPromise] = await Promise.all([
      db
        .promise()
        .query(
          "SELECT p.*, u.username as owner_name FROM projects as p JOIN users as u ON p.owner_id = u.user_id WHERE p.project_id = ?",
          [id]
        ),
      db
        .promise()
        .query(
          "SELECT u.user_id, u.username, u.email, pm.role_in_project FROM project_members as pm JOIN users as u ON pm.user_id = u.user_id WHERE pm.project_id = ?",
          [id]
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

// 2.4. 프로젝트 정보 수정 (UPDATE)
app.put("/api/projects/:id", (req, res) => {
  // TODO: 인증 로직 추가 (프로젝트 manager 또는 owner만 수정 가능하도록)
  const { id } = req.params;
  const { name, content } = req.body;
  if (!name) {
    return res.status(400).json({ error: "프로젝트 이름은 필수입니다." });
  }

  const sql = "UPDATE projects SET name = ?, content = ? WHERE id = ?";
  db.query(sql, [name, description, id], (err, result) => {
    if (err) {
      console.error("Error updating project:", err);
      return res
        .status(500)
        .json({ error: "프로젝트 수정 중 오류가 발생했습니다." });
    }
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "프로젝트를 찾을 수 없거나 변경 사항이 없습니다." });
    }
    res.json({ message: "프로젝트가 성공적으로 수정되었습니다." });
  });
});

// 2.5. 프로젝트 삭제 (DELETE)
app.delete("/api/projects/:id", async (req, res) => { // async 키워드 추가
  const { id } = req.params; // 삭제할 프로젝트 ID
  // 요청 본문에서 userId를 가져옵니다. (프론트엔드에서 data: { userId: user.user_id } 로 보냈을 경우)
  const { userId } = req.body;

  // 1. 요청을 보낸 사용자 ID가 있는지 확인
  if (!userId) {
    return res.status(401).json({ error: "인증되지 않은 사용자입니다." });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 2. 삭제하려는 프로젝트의 owner_id를 조회
    const [projectRows] = await connection.query(
      "SELECT created_by FROM projects WHERE project_id = ?", // project_id로 컬럼명 수정
      [id]
    );

    if (projectRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "프로젝트를 찾을 수 없습니다." });
    }

    const projectOwnerId = projectRows[0].owner_id;

    // 3. 요청을 보낸 사용자가 프로젝트의 owner인지 확인
    if (projectOwnerId !== parseInt(userId)) { // userId는 문자열일 수 있으므로 parseInt
      await connection.rollback();
      return res.status(403).json({ error: "프로젝트 소유자만 삭제할 수 있습니다." });
    }

    // 4. 소유자가 맞다면 프로젝트 삭제 진행
    const [deleteResult] = await connection.query(
      "DELETE FROM projects WHERE project_id = ?", // project_id로 컬럼명 수정
      [id]
    );

    if (deleteResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "프로젝트를 찾을 수 없거나 이미 삭제되었습니다." });
    }

    // 5. 활동 로그 기록 (선택 사항: 삭제 시에도 로그 남기기)
    // 프로젝트 이름 등을 알기 위해 다시 조회하는 로직을 추가하거나,
    // projectRows[0]에서 project_name을 가져올 수 있다면 활용
    await logActivity(userId, id, null, "PROJECT_DELETED", {
      projectId: id,
      // projectName: projectRows[0].project_name // 만약 위 쿼리에서 project_name도 가져왔다면
    });

    await connection.commit();
    res.json({ message: "프로젝트가 성공적으로 삭제되었습니다." });

  } catch (err) {
    await connection.rollback();
    console.error("Error deleting project:", err);
    res.status(500).json({ error: "프로젝트 삭제 중 오류가 발생했습니다." });
  } finally {
    connection.release();
  }
});


// --- 3. 업무 API (Tasks) ---

// 3.1. 특정 프로젝트의 모든 업무 가져오기 (READ ALL FROM PROJECT)
app.get("/api/projects/:projectId/tasks", (req, res) => {
  const { projectId } = req.params;
  const sql = `
        SELECT t.*, GROUP_CONCAT(u.username SEPARATOR ', ') AS assignees
        FROM tasks AS t LEFT JOIN task_assignees AS ta ON t.task_id = ta.task_id
        LEFT JOIN users AS u ON ta.user_id = u.user_id
        WHERE t.project_id = ?
        GROUP BY t.task_id
        ORDER BY t.created_at DESC;
    `;
  db.query(sql, [projectId], (err, results) => {
    if (err) {
      console.error(`Error fetching tasks for project ${projectId}:`, err);
      return res
        .status(500)
        .json({ error: "업무 목록을 불러오는 중 오류가 발생했습니다." });
    }
    res.json(results);
  });
});

// 3.2. 새로운 업무 생성 (CREATE)
app.post("/api/projects/:projectId/tasks", (req, res) => {
  const { projectId } = req.params;
  const {
    title,
    description,
    status,
    due_date,
    assigned_to_user_id,
    created_by_user_id,
  } = req.body;

  if (!title || !created_by_user_id) {
    return res
      .status(400)
      .json({ error: "업무 제목과 생성자 ID는 필수입니다." });
  }

  const sql = `
        INSERT INTO tasks
        (project_id, title, description, status, due_date, assigned_to_user_id, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
  db.query(
    sql,
    [
      projectId,
      title,
      description,
      status || "To Do",
      due_date,
      assigned_to_user_id,
      created_by_user_id,
    ],
    (err, result) => {
      if (err) {
        console.error("Error creating task:", err);
        return res
          .status(500)
          .json({ error: "업무 생성 중 오류가 발생했습니다." });
      }
      const newTaskId = result.insertId;
      // 활동 로그 기록
      logActivity(created_by_user_id, projectId, newTaskId, "TASK_CREATED", {
        taskTitle: title,
      });
      // TODO: assigned_to_user_id가 있다면 해당 사용자에게 알림 생성 로직 추가
      res
        .status(201)
        .json({ message: "업무가 성공적으로 생성되었습니다.", id: newTaskId });
    }
  );
});

// 3.3. 특정 업무 상세 정보 가져오기 (READ ONE)
app.get("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const sql = `
        SELECT
            t.*,
            creator.username AS created_by_username,
            assignee.username AS assigned_to_username
        FROM tasks t
        JOIN users creator ON t.created_by_user_id = creator.id
        LEFT JOIN users assignee ON t.assigned_to_user_id = assignee.id
        WHERE t.id = ?
    `;
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error fetching task:", err);
      return res
        .status(500)
        .json({ error: "업무 정보를 불러오는 중 오류가 발생했습니다." });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "업무를 찾을 수 없습니다." });
    }
    res.json(result[0]);
  });
});

// 3.4. 업무 정보 수정 (UPDATE)
app.put("/api/tasks/:id", (req, res) => {
  // TODO: 인증 로직 추가 (프로젝트 멤버만 수정 가능하도록)
  const { id } = req.params;
  const { title, description, status, due_date, assigned_to_user_id } =
    req.body;

  // TODO: 변경된 필드만 감지하여 동적 쿼리 생성 및 활동 로그 상세 기록
  const sql = `
        UPDATE tasks SET
        title = ?, description = ?, status = ?, due_date = ?, assigned_to_user_id = ?
        WHERE id = ?
    `;
  db.query(
    sql,
    [title, description, status, due_date, assigned_to_user_id, id],
    (err, result) => {
      if (err) {
        console.error("Error updating task:", err);
        return res
          .status(500)
          .json({ error: "업무 수정 중 오류가 발생했습니다." });
      }
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "업무를 찾을 수 없거나 변경 사항이 없습니다." });
      }
      // TODO: 활동 로그 기록 ('TASK_STATUS_UPDATED', 'TASK_ASSIGNEE_CHANGED' 등)
      // TODO: 담당자 변경/지정 시 알림 생성
      res.json({ message: "업무가 성공적으로 수정되었습니다." });
    }
  );
});

// 3.5. 업무 삭제 (DELETE)
app.delete("/api/tasks/:id", (req, res) => {
  // TODO: 인증 로직 추가 (프로젝트 멤버만 삭제 가능하도록)
  const { id } = req.params;
  const sql = "DELETE FROM tasks WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting task:", err);
      return res
        .status(500)
        .json({ error: "업무 삭제 중 오류가 발생했습니다." });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "업무를 찾을 수 없습니다." });
    }
    // TODO: 활동 로그 기록
    res.json({ message: "업무가 성공적으로 삭제되었습니다." });
  });
});

// --- 4. 댓글 API (Comments on Tasks) ---

// 4.1. 특정 업무의 모든 댓글 가져오기
app.get("/api/tasks/:taskId/comments", (req, res) => {
  const { taskId } = req.params;
  const sql = `
        SELECT c.*, u.username
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.task_id = ?
        ORDER BY c.created_at ASC
    `;
  db.query(sql, [taskId], (err, results) => {
    if (err) {
      console.error(`Error fetching comments for task ${taskId}:`, err);
      return res
        .status(500)
        .json({ error: "댓글을 불러오는 중 오류가 발생했습니다." });
    }
    res.json(results);
  });
});

// 4.2. 새로운 댓글 작성
app.post("/api/tasks/:taskId/comments", (req, res) => {
  const { taskId } = req.params;
  const { user_id, content } = req.body;
  if (!user_id || !content) {
    return res
      .status(400)
      .json({ error: "사용자 ID와 댓글 내용은 필수입니다." });
  }

  const sql =
    "INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)";
  db.query(sql, [taskId, user_id, content], (err, result) => {
    if (err) {
      console.error("Error creating comment:", err);
      return res
        .status(500)
        .json({ error: "댓글 작성 중 오류가 발생했습니다." });
    }
    const newCommentId = result.insertId;
    // TODO: 활동 로그 기록
    // TODO: 업무 관련자들에게 댓글 알림 생성
    res
      .status(201)
      .json({ message: "댓글이 성공적으로 작성되었습니다.", id: newCommentId });
  });
});

// --- 5. 프로필 API ---
app.get("/api/profile", (req, res) => {
  // 프론트에서 user_id 를 쿼리 파라미터 또는 헤더로 전달한다고 가정
  const userId = req.query.user_id; // 또는 req.headers['user-id']

  if (!userId) {
    return res.status(400).json({ error: "사용자 ID가 필요합니다." });
  }

  const sql = `
    SELECT user_id AS id, username AS name, email, created_at AS createdAt
    FROM users
    WHERE user_id = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching profile:", err);
      return res
        .status(500)
        .json({ error: "프로필 정보를 불러오는 중 오류가 발생했습니다." });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    res.json(results[0]);
  });
});

//6. 알람 불러오기
app.get("/api/tasks/due_date", (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res
      .status(400)
      .json({ error: "사용자 ID(userId) 쿼리 파라미터가 필요합니다." });
  }

  // due_date가 오늘부터 7일 이내이면서 해당 userId에게 할당된 태스크를 조회합니다.
  // CURDATE(): 현재 날짜를 반환하는 SQL 함수 (MySQL 기준)
  // INTERVAL 7 DAY: 현재 날짜에 7일을 더하는 연산
  // BETWEEN A AND B: A와 B 사이에 있는 값 (A와 B 포함)
  const sql = `
    SELECT t.*
    FROM task t
    JOIN task_assignees ta ON t.task_id = ta.task_id
    WHERE ta.user_id = ?
      AND t.due_date IS NOT NULL
      AND t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ORDER BY t.due_date ASC;
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching tasks due soon:", err);
      return res
        .status(500)
        .json({ error: "마감 임박 태스크 목록을 불러오는 중 오류가 발생했습니다." });
    }
    res.json(results);
  });
});


// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

