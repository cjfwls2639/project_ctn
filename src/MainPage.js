import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "./api/axios.js";
import "./styles/MainPage.css";
import "./styles/Sidebar.css";
import "./styles/NavigationBar.css";
import "./styles/MainContent.css";
//commit
const ProjectModal = ({ isOpen, onClose, onSubmit }) => {
  const [projectName, setProjectName] = useState("");
  const [dDay, setDDay] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (projectName.trim()) {
      onSubmit({
        name: projectName,
        dDay: dDay,
        content: content,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>새 프로젝트 생성</h2>
        <form onSubmit={handleSubmit}>
          <div className="modal-input-group">
            <label>프로젝트 이름</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="프로젝트 이름을 입력하세요"
              required
            />
          </div>
          <div className="modal-input-group">
            <label>D-Day</label>
            <input
              type="date"
              value={dDay}
              onChange={(e) => setDDay(e.target.value)}
            />
          </div>
          <div className="modal-input-group">
            <label>프로젝트 설명</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="프로젝트에 대한 설명을 입력하세요"
              rows="4"
            />
          </div>
          <div className="modal-buttons">
            <button
              type="button"
              onClick={onClose}
              className="modal-cancel-btn"
            >
              취소
            </button>
            <button type="submit" className="modal-submit-btn">
              생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

//d-day 계산 함수
// const calculateDday = (dateString) => {
//   if (!dateString) return "미설정";

//   const targetDate = new Date(dateString);
//   const today = new Date();
//   const diff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

//   if (diff > 0) {
//     return `D-${diff}`;
//   } else if (diff === 0) {
//     return "D-Day";
//   } else {
//     return `D+${Math.abs(diff)}`;
//   }
// };

const MainPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isAlarmMenuOpen, setIsAlarmMenuOpen] = useState(false);
  const [alarms, setAlarms] = useState([]);
  const [alarmCount, setAlarmCount] = useState(0);
  const [selectedTab, setSelectedTab] = useState("메인");
  const [error, setError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [user, _setUser] = useState(() => JSON.parse(localStorage.getItem("user")));

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR");
  };

  const fetchProjects = useCallback(async () => {
    if (!user || !user.user_id) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get("/api/projects", {
        params: { userId: user.user_id }, // 서버 API가 요구하는 userId를 쿼리 파라미터로 전달
      });
      setProjects(response.data);
      // 목록을 새로 불러온 후, 첫 번째 프로젝트를 자동으로 선택
      if (response.data.length > 0) {
        // 이전에 선택한 프로젝트가 있다면 유지, 없다면 첫번째 프로젝트 선택
        if (
          !selectedProjectId ||
          !response.data.find((p) => p.id === selectedProjectId)
        ) {
          setSelectedProjectId(response.data[0].id);
        }
      } else {
        setSelectedProjectId(null); // 프로젝트가 없으면 선택 해제
      }
    } catch (error) {
      console.error("프로젝트 목록을 불러오는 데 실패했습니다:", error);
      alert("프로젝트 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, selectedProjectId, navigate]);

  //알람 불러오기
  const fetchAlarms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/tasks/due_date", {
        params: { userId: user.user_id },
      });
      setAlarms(response.data);
      setAlarmCount(response.data.length);
    } catch (err) {
      console.error("알림을 불러오는 중 오류 발생:", err);
      setError("알림을 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("user"));

    if (loggedInUser && loggedInUser.user_id) {
      fetchAlarms();
      fetchProjects();
    } else {
      navigate("/login");
    }
  }, [navigate, fetchAlarms, fetchProjects]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  // CHANGED: 프로젝트 생성 핸들러 (API 호출)
  const handleCreateProject = async (projectData) => {
    if (!user || !user.user_id) {
      alert("사용자 정보가 없습니다. 다시 로그인해주세요.");
      return;
    }

    try {
      const response = await axios.post("/api/projects", {
        name: projectData.name,
        content: projectData.content,
        created_by: user.user_id, 
      });
      alert(response.data.message);
      await fetchProjects(); // 프로젝트 생성 후 목록을 다시 불러옵니다.
      closeModal();
    } catch (error) {
      console.error("프로젝트 생성 실패:", error);
      alert("프로젝트 생성 중 오류가 발생했습니다.");
    }
  };

  // CHANGED: 프로젝트 삭제 핸들러 (API 호출)
  const handleDeleteProject = async () => {
    if (!selectedProjectId) {
      alert("삭제할 프로젝트를 선택해주세요.");
      return;
    }

    // 현재 로그인된 사용자 정보 가져오기
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.user_id) {
      // 로그인 여부 확인
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    if (
      window.confirm(
        "프로젝트를 삭제하시겠습니까? 관련된 모든 업무와 댓글이 삭제됩니다."
      )
    ) {
      try {
        const response = await axios.delete(
          `/api/projects/${selectedProjectId}`,
          {
            // 요청 본문에 ownerId를 포함하여 보냅니다.
            // 실제 DELETE 요청은 body를 잘 사용하지 않으므로, header나 query parameter로 보내는 것을 권장하지만,
            // 여기서는 간단하게 body로 보내는 예시를 보여줍니다.
            // 더 나은 방법: 요청 헤더에 Authorization 토큰을 보내는 인증 미들웨어 사용 (더 복잡)
            data: { userId: user.user_id }, // <-- 이 부분을 추가합니다.
          }
        );
        alert(response.data.message);
        await fetchProjects();
      } catch (error) {
        console.error("프로젝트 삭제 실패:", error);
        // 서버에서 보낸 에러 메시지가 있다면 사용
        alert(
          error.response?.data?.error || "프로젝트 삭제 중 오류가 발생했습니다."
        );
      }
    }
  };

  const toggleAccountMenu = () => setIsAccountMenuOpen(!isAccountMenuOpen);
  const toggleAlarmMenu = () => setIsAlarmMenuOpen(!isAlarmMenuOpen);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div>
      <div className="main-container">
        <div className="content-wrapper">
          <nav className="navbar">
            <nav className="navbar">
              <div className="navbar-brand">
                <h1 onClick={() => navigate("/main")}>To Be Continew</h1>
              </div>
              <div className="navbar-controls">
                <div className="alarm-dropdown" onClick={toggleAlarmMenu}>
                  <button className="alarm-btn">
                    🔔
                    {alarmCount > 0 && (
                      <span className="alarm-badge">{alarmCount}</span>
                    )}
                  </button>
                  <div
                    className="alarm-menu"
                    style={{ display: isAlarmMenuOpen ? "block" : "none" }}
                  >
                    {loading ? (
                      <div className="alarm-item">로딩 중...</div>
                    ) : error ? (
                      <div className="alarm-item error">{error}</div>
                    ) : alarmCount > 0 ? (
                      // 데이터가 있을 경우, ul과 li로 목록 렌더링
                      <ul className="alarm-list">
                        <li className="alarm-header">
                          마감 임박 태스크 ({alarmCount}개)
                        </li>
                        {alarms.map((task) => (
                          // map 사용 시 각 항목은 고유한 'key' prop을 가져야 합니다.
                          <li key={task.task_id} className="alarm-item">
                            <div className="task-title">{task.title}</div>
                            <div className="task-due-date">
                              마감일: {formatDate(task.due_date)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="alarm-item">알림이 없습니다.</div>
                    )}
                  </div>
                </div>
                <div className="auth-dropdown" onClick={toggleAccountMenu}>
                  <button className="auth-btn">
                    <span className="material-icons">account_circle</span>
                  </button>
                  <div
                    className="auth-menu"
                    style={{ display: isAccountMenuOpen ? "block" : "none" }}
                  >
                    <button
                      className="auth-menu-item"
                      onClick={() => navigate("/profile")}
                    >
                      <span className="material-icons">person</span>
                      <span>내 정보 변경</span>
                    </button>
                    <button className="auth-menu-item" onClick={handleLogout}>
                      <span className="material-icons">logout</span>
                      <span>로그아웃</span>
                    </button>
                  </div>
                </div>
              </div>
            </nav>
          </nav>
          <aside className="sidebar">
            <div className="sidebar-header">
              <h2>프로젝트 목록</h2>
            </div>
            <nav className="sidebar-nav">
              <ul>
                {/* CHANGED: projects 배열을 순회하며 project.id와 project.name을 사용 */}
                {projects.map((project) => (
                  <li
                    key={project.id}
                    className={project.id === selectedProjectId ? "active" : ""}
                  >
                    <button
                      className="sidebar-link"
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      {project.project_name}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="sidebar-buttons">
              <button className="sidebar-btn primary" onClick={openModal}>
                프로젝트 <br />
                생성
              </button>
              {/* CHANGED: handleDeleteProject 함수 연결 */}
              <button
                className="sidebar-btn secondary"
                onClick={handleDeleteProject}
              >
                프로젝트 <br />
                삭제
              </button>
            </div>
          </aside>
          <div className="main-content">
            {loading ? (
              <p>프로젝트를 불러오는 중...</p>
            ) : projects.length > 0 && selectedProject ? (
              <div>
                <h1 className="project-title">{selectedProject.name}</h1>
                <div className="content-container">
                  <div className="project-info">
                    {selectedProject !== null && (
                      <div className="action-buttons">
                        <button
                          className="action-btn primary"
                          onClick={() => setSelectedTab("메인")}
                        >
                          메인
                        </button>
                        <button
                          className="action-btn secondary"
                          onClick={() => setSelectedTab("업무")}
                        >
                          업무
                        </button>
                        <button
                          className="action-btn tertiary"
                          onClick={() => setSelectedTab("로그")}
                        >
                          로그
                        </button>
                        <button
                          className="action-btn quaternary"
                          onClick={() => setSelectedTab("알람")}
                        >
                          알람
                        </button>
                        <button
                          className="action-btn quinary"
                          onClick={() => setSelectedTab("사용자")}
                        >
                          사용자
                        </button>
                      </div>
                    )}
                    {selectedProject === null && <p>프로젝트를 선택해주세요</p>}
                  </div>
                  <div className="project-details-content">
                    {/* TODO: 이 부분도 동적으로 DB 데이터와 연결 (예시: selectedProject.description) */}
                    <h2>{selectedTab} 현황</h2>
                    <p>
                      프로젝트 설명:{" "}
                      {selectedProject.content || "설명이 없습니다."}
                    </p>
                    <p>소유자: {selectedProject.created_by}</p>
                    {/* 나머지 상세 정보도 selectedProject 객체의 속성을 이용하여 표시 */}
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-projects">
                <h2>프로젝트가 없습니다</h2>
                <p>새로운 프로젝트를 생성해보세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <ProjectModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};

export default MainPage;
