import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "./api/axios.js";
import "./styles/MainPage.css";
import "./styles/Sidebar.css";
import "./styles/NavigationBar.css";
import "./styles/MainContent.css";

const ProjectModal = ({ isOpen, onClose, onSubmit }) => {
  const [projectName, setProjectName] = useState("");
  const [dDay, setDDay] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (projectName.trim()) {
      onSubmit({
        name: projectName,
        dDay: dDay,
        description: description,
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

const calculateDday = (dateString) => {
  if (!dateString) return "미설정";

  const targetDate = new Date(dateString);
  const today = new Date();
  const diff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

  if (diff > 0) {
    return `D-${diff}`;
  } else if (diff === 0) {
    return "D-Day";
  } else {
    return `D+${Math.abs(diff)}`;
  }
};

const MainPage = () => {
  const navigate = useNavigate();

  // NEW: 로딩 상태 추가
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  // CHANGED: selectedProject는 이제 index가 아닌 project의 'id'를 저장합니다.
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ... 기타 상태값들은 기존과 동일
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isAlarmMenuOpen, setIsAlarmMenuOpen] = useState(false);
  const [alarmCount, setAlarmCount] = useState(0);
  const [selectedTab, setSelectedTab] = useState("메인");

  // NEW: localStorage에서 사용자 정보 가져오기
  const user = JSON.parse(localStorage.getItem("user"));

  // NEW: 프로젝트 목록을 불러오는 함수
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
  }, [user, navigate, selectedProjectId]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user, fetchProjects]);

  const handleLogout = () => {
    localStorage.removeItem("user"); // 로그아웃 시 사용자 정보 제거
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
        description: projectData.description,
        owner_id: user.user_id, // 로그인한 사용자 ID를 owner_id로 전달
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
    if (
      window.confirm(
        "프로젝트를 삭제하시겠습니까? 관련된 모든 업무와 댓글이 삭제됩니다."
      )
    ) {
      try {
        const response = await axios.delete(
          `/api/projects/${selectedProjectId}`
        );
        alert(response.data.message);
        await fetchProjects(); // 프로젝트 삭제 후 목록을 다시 불러옵니다.
      } catch (error) {
        console.error("프로젝트 삭제 실패:", error);
        alert("프로젝트 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  // ... toggle 함수, 모달 여닫는 함수는 기존과 동일 ...
  const toggleAccountMenu = () => setIsAccountMenuOpen(!isAccountMenuOpen);
  const toggleAlarmMenu = () => setIsAlarmMenuOpen(!isAlarmMenuOpen);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // CHANGED: 선택된 프로젝트 객체 찾기
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // ... 중략 (나머지 렌더링 로직은 아래에서 확인) ...
  // `details` 객체는 이제 selectedProject를 기반으로 동적으로 생성되어야 합니다.

  return (
    <div>
      <div className="main-container">
        <div className="content-wrapper">
          <nav className="navbar">
          <nav className="navbar">
            <div className="navbar-brand">
              <h1 onClick={() => navigate('/main')}>To Be Continew</h1>
            </div>
          <div className="navbar-controls">
            <div className="alarm-dropdown" onClick={toggleAlarmMenu}>
              <button className="alarm-btn">
                🔔
                {alarmCount > 0 && (
                  <span className="alarm-badge">{alarmCount}</span>
                )}
              </button>
              <div className="alarm-menu" style={{ display: isAlarmMenuOpen ? 'block' : 'none' }}>
                {alarmCount > 0 ? (
                  <div className="alarm-item">새로운 알림이 {alarmCount}개 있습니다</div>
                ) : (
                  <div className="alarm-item">새로운 알림이 없습니다</div>
                )}
              </div>
            </div>
            <div className="auth-dropdown" onClick={toggleAccountMenu}>
              <button className="auth-btn">
                <span className="material-icons">account_circle</span>
              </button>
              <div className="auth-menu" style={{ display: isAccountMenuOpen ? 'block' : 'none' }}>
                <a className="auth-menu-item" onClick={() => navigate('/profile')}>
                  <span className="material-icons">person</span>
                  <span>내 정보 변경</span>
                </a>
                <a className="auth-menu-item" onClick={handleLogout}>
                  <span className="material-icons">logout</span>
                  <span>로그아웃</span>
                </a>
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
                    <a
                      className="sidebar-link"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      {project.name}
                    </a>
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
              <>
                <h1 className="project-title">{selectedProject.name}</h1>
                <div className="content-container">
                  <div className="project-info">{selectedProject !== null && (
                  <div className="action-buttons">
                    <button 
                      className="action-btn primary" 
                      onClick={() => setSelectedTab('메인')}
                    >
                      메인
                    </button>
                    <button 
                      className="action-btn secondary" 
                      onClick={() => setSelectedTab('업무')}
                    >
                      업무
                    </button>
                    <button 
                      className="action-btn tertiary" 
                      onClick={() => setSelectedTab('로그')}
                    >
                      로그
                    </button>
                    <button 
                      className="action-btn quaternary" 
                      onClick={() => setSelectedTab('알람')}
                    >
                      알람
                    </button>
                    <button 
                      className="action-btn quinary" 
                      onClick={() => setSelectedTab('사용자')}
                    >
                      사용자
                    </button>
                  </div>
                )}
                {selectedProject === null && (
                  <p>프로젝트를 선택해주세요</p>
                )}</div>
                  <div className="project-details-content">
                    {/* TODO: 이 부분도 동적으로 DB 데이터와 연결 (예시: selectedProject.description) */}
                    <h2>{selectedTab} 현황</h2>
                    <p>
                      프로젝트 설명:{" "}
                      {selectedProject.description || "설명이 없습니다."}
                    </p>
                    <p>소유자: {selectedProject.owner_name}</p>
                    {/* 나머지 상세 정보도 selectedProject 객체의 속성을 이용하여 표시 */}
                  </div>
                </div>
              </>
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
