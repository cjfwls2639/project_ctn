const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const db = require('./db'); // db.js 설정은 기존과 동일하다고 가정합니다.

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- Helper Functions (나중에 별도 모듈로 분리 가능) ---
// 활동 로그 기록 함수 (예시)
const logActivity = async (userId, projectId, taskId, actionType, details) => {
    const sql = 'INSERT INTO activity_logs (user_id, project_id, task_id, action_type, details) VALUES (?, ?, ?, ?, ?)';
    try {
        await db.promise().query(sql, [userId, projectId, taskId, actionType, JSON.stringify(details)]);
        console.log(`Activity logged: ${actionType}`);
    } catch (err) {
        console.error('Error logging activity:', err);
        // 로깅 실패가 주 로직에 영향을 주지 않도록 에러를 던지지 않음
    }
};

// --- 1. 사용자 인증 API (Users) ---

// 회원가입 (Register) - 스키마에 맞게 컬럼명 수정
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
        return res.status(400).json({ error: '사용자 이름, 비밀번호, 이메일을 모두 입력해주세요.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // 테이블명 'users', 컬럼명 'password_hash' 사용
        const sql = 'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)';
        db.query(sql, [username, hashedPassword, email], (err, result) => {
            if (err) {
                console.error('Error registering user:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: '이미 존재하는 사용자 이름 또는 이메일입니다.' });
                }
                return res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
            }
            res.status(201).json({ message: '회원가입 성공!', id: result.insertId }); // 'user_id' -> 'id'
        });
    } catch (hashError) {
        console.error('Error hashing password:', hashError);
        res.status(500).json({ error: '비밀번호 처리 중 오류가 발생했습니다.' });
    }
});

// 로그인 (Login) - 스키마에 맞게 컬럼명 수정
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '사용자 이름과 비밀번호를 입력해주세요.' });
    }
    // 테이블명 'users', 컬럼명 'id', 'password_hash' 사용
    const sql = 'SELECT id, username, password_hash FROM users WHERE username = ?';
    db.query(sql, [username], async (err, results) => {
        if (err) {
            console.error('Error finding user:', err);
            return res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
        }
        if (results.length === 0) {
            return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
        }

        res.json({ message: '로그인 성공!', id: user.id, username: user.username }); // 'user_id' -> 'id'
    });
});


// --- 2. 프로젝트 API (Projects) ---

// 2.1. 새로운 프로젝트 생성 (CREATE)
app.post('/api/projects', async (req, res) => {
    const { name, description, owner_id } = req.body;
    if (!name || !owner_id) {
        return res.status(400).json({ error: '프로젝트 이름과 소유자 ID는 필수입니다.' });
    }

    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();

        // 1. projects 테이블에 프로젝트 생성
        const projectSql = 'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)';
        const [projectResult] = await connection.query(projectSql, [name, description, owner_id]);
        const projectId = projectResult.insertId;

        // 2. project_members 테이블에 소유자를 'manager'로 추가
        const memberSql = 'INSERT INTO project_members (project_id, user_id, role_in_project) VALUES (?, ?, ?)';
        await connection.query(memberSql, [projectId, owner_id, 'manager']);

        // 3. 활동 로그 기록
        await logActivity(owner_id, projectId, null, 'PROJECT_CREATED', { projectName: name });

        await connection.commit();
        res.status(201).json({ message: '프로젝트가 성공적으로 생성되었습니다.', id: projectId });
    } catch (err) {
        await connection.rollback();
        console.error('Error creating project:', err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
             return res.status(400).json({ error: '존재하지 않는 소유자 ID입니다.' });
        }
        res.status(500).json({ error: '프로젝트 생성 중 오류가 발생했습니다.' });
    } finally {
        connection.release();
    }
});

// 2.2. 특정 사용자가 참여중인 모든 프로젝트 목록 가져오기 (READ ALL FOR USER)
app.get('/api/projects', (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: '사용자 ID(userId) 쿼리 파라미터가 필요합니다.' });
    }
    // project_members 테이블과 JOIN하여 해당 사용자가 속한 프로젝트만 조회
    const sql = `
        SELECT p.*, u.username as owner_name, pm.role_in_project
        FROM projects p
        JOIN users u ON p.owner_id = u.id
        JOIN project_members pm ON p.id = pm.project_id
        WHERE pm.user_id = ?
        ORDER BY p.created_at DESC
    `;
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching projects:', err);
            return res.status(500).json({ error: '프로젝트 목록을 불러오는 중 오류가 발생했습니다.' });
        }
        res.json(results);
    });
});

// 2.3. 특정 프로젝트 상세 정보 가져오기 (READ ONE)
app.get('/api/projects/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Promise.all을 사용하여 프로젝트 정보와 멤버 목록을 병렬로 조회
        const [projectPromise, membersPromise] = await Promise.all([
            db.promise().query('SELECT p.*, u.username as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?', [id]),
            db.promise().query('SELECT u.id, u.username, u.email, pm.role_in_project FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = ?', [id])
        ]);

        const [projectResult] = projectPromise;
        const [membersResult] = membersPromise;

        if (projectResult.length === 0) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }

        res.json({
            project: projectResult[0],
            members: membersResult
        });
    } catch (err) {
        console.error('Error fetching project details:', err);
        res.status(500).json({ error: '프로젝트 상세 정보를 불러오는 중 오류가 발생했습니다.' });
    }
});

// 2.4. 프로젝트 정보 수정 (UPDATE)
app.put('/api/projects/:id', (req, res) => {
    // TODO: 인증 로직 추가 (프로젝트 manager 또는 owner만 수정 가능하도록)
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ error: '프로젝트 이름은 필수입니다.' });
    }

    const sql = 'UPDATE projects SET name = ?, description = ? WHERE id = ?';
    db.query(sql, [name, description, id], (err, result) => {
        if (err) {
            console.error('Error updating project:', err);
            return res.status(500).json({ error: '프로젝트 수정 중 오류가 발생했습니다.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없거나 변경 사항이 없습니다.' });
        }
        res.json({ message: '프로젝트가 성공적으로 수정되었습니다.' });
    });
});

// 2.5. 프로젝트 삭제 (DELETE)
app.delete('/api/projects/:id', (req, res) => {
    // TODO: 인증 로직 추가 (프로젝트 owner만 삭제 가능하도록)
    const { id } = req.params;
    const sql = 'DELETE FROM projects WHERE id = ?'; // ON DELETE CASCADE 덕분에 관련 멤버, 업무, 댓글 등도 모두 삭제됨
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting project:', err);
            return res.status(500).json({ error: '프로젝트 삭제 중 오류가 발생했습니다.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다.' });
        }
        res.json({ message: '프로젝트가 성공적으로 삭제되었습니다.' });
    });
});


// --- 3. 업무 API (Tasks) ---

// 3.1. 특정 프로젝트의 모든 업무 가져오기 (READ ALL FROM PROJECT)
app.get('/api/projects/:projectId/tasks', (req, res) => {
    const { projectId } = req.params;
    const sql = `
        SELECT
            t.*,
            creator.username AS created_by_username,
            assignee.username AS assigned_to_username
        FROM tasks t
        JOIN users creator ON t.created_by_user_id = creator.id
        LEFT JOIN users assignee ON t.assigned_to_user_id = assignee.id
        WHERE t.project_id = ?
        ORDER BY t.created_at DESC
    `;
    db.query(sql, [projectId], (err, results) => {
        if (err) {
            console.error(`Error fetching tasks for project ${projectId}:`, err);
            return res.status(500).json({ error: '업무 목록을 불러오는 중 오류가 발생했습니다.' });
        }
        res.json(results);
    });
});

// 3.2. 새로운 업무 생성 (CREATE)
app.post('/api/projects/:projectId/tasks', (req, res) => {
    const { projectId } = req.params;
    const { title, description, status, due_date, assigned_to_user_id, created_by_user_id } = req.body;

    if (!title || !created_by_user_id) {
        return res.status(400).json({ error: '업무 제목과 생성자 ID는 필수입니다.' });
    }

    const sql = `
        INSERT INTO tasks
        (project_id, title, description, status, due_date, assigned_to_user_id, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [projectId, title, description, status || 'To Do', due_date, assigned_to_user_id, created_by_user_id], (err, result) => {
        if (err) {
            console.error('Error creating task:', err);
            return res.status(500).json({ error: '업무 생성 중 오류가 발생했습니다.' });
        }
        const newTaskId = result.insertId;
        // 활동 로그 기록
        logActivity(created_by_user_id, projectId, newTaskId, 'TASK_CREATED', { taskTitle: title });
        // TODO: assigned_to_user_id가 있다면 해당 사용자에게 알림 생성 로직 추가
        res.status(201).json({ message: '업무가 성공적으로 생성되었습니다.', id: newTaskId });
    });
});

// 3.3. 특정 업무 상세 정보 가져오기 (READ ONE)
app.get('/api/tasks/:id', (req, res) => {
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
            console.error('Error fetching task:', err);
            return res.status(500).json({ error: '업무 정보를 불러오는 중 오류가 발생했습니다.' });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: '업무를 찾을 수 없습니다.' });
        }
        res.json(result[0]);
    });
});

// 3.4. 업무 정보 수정 (UPDATE)
app.put('/api/tasks/:id', (req, res) => {
    // TODO: 인증 로직 추가 (프로젝트 멤버만 수정 가능하도록)
    const { id } = req.params;
    const { title, description, status, due_date, assigned_to_user_id } = req.body;

    // TODO: 변경된 필드만 감지하여 동적 쿼리 생성 및 활동 로그 상세 기록
    const sql = `
        UPDATE tasks SET
        title = ?, description = ?, status = ?, due_date = ?, assigned_to_user_id = ?
        WHERE id = ?
    `;
    db.query(sql, [title, description, status, due_date, assigned_to_user_id, id], (err, result) => {
        if (err) {
            console.error('Error updating task:', err);
            return res.status(500).json({ error: '업무 수정 중 오류가 발생했습니다.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '업무를 찾을 수 없거나 변경 사항이 없습니다.' });
        }
        // TODO: 활동 로그 기록 ('TASK_STATUS_UPDATED', 'TASK_ASSIGNEE_CHANGED' 등)
        // TODO: 담당자 변경/지정 시 알림 생성
        res.json({ message: '업무가 성공적으로 수정되었습니다.' });
    });
});

// 3.5. 업무 삭제 (DELETE)
app.delete('/api/tasks/:id', (req, res) => {
    // TODO: 인증 로직 추가 (프로젝트 멤버만 삭제 가능하도록)
    const { id } = req.params;
    const sql = 'DELETE FROM tasks WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting task:', err);
            return res.status(500).json({ error: '업무 삭제 중 오류가 발생했습니다.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '업무를 찾을 수 없습니다.' });
        }
        // TODO: 활동 로그 기록
        res.json({ message: '업무가 성공적으로 삭제되었습니다.' });
    });
});


// --- 4. 댓글 API (Comments on Tasks) ---

// 4.1. 특정 업무의 모든 댓글 가져오기
app.get('/api/tasks/:taskId/comments', (req, res) => {
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
            return res.status(500).json({ error: '댓글을 불러오는 중 오류가 발생했습니다.' });
        }
        res.json(results);
    });
});

// 4.2. 새로운 댓글 작성
app.post('/api/tasks/:taskId/comments', (req, res) => {
    const { taskId } = req.params;
    const { user_id, content } = req.body;
    if (!user_id || !content) {
        return res.status(400).json({ error: '사용자 ID와 댓글 내용은 필수입니다.' });
    }

    const sql = 'INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)';
    db.query(sql, [taskId, user_id, content], (err, result) => {
        if (err) {
            console.error('Error creating comment:', err);
            return res.status(500).json({ error: '댓글 작성 중 오류가 발생했습니다.' });
        }
        const newCommentId = result.insertId;
        // TODO: 활동 로그 기록
        // TODO: 업무 관련자들에게 댓글 알림 생성
        res.status(201).json({ message: '댓글이 성공적으로 작성되었습니다.', id: newCommentId });
    });
});


// 서버 시작
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});