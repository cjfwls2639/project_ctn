import React from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/MainPage.css';
import './styles/Sidebar.css';
import './styles/NavigationBar.css';
import './styles/MainContent.css';

const ProjectModal = ({ isOpen, onClose, onSubmit }) => {
  const [projectName, setProjectName] = React.useState('');
  const [dDay, setDDay] = React.useState('');
  const [description, setDescription] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (projectName.trim()) {
      onSubmit({
        name: projectName,
        dDay: dDay,
        description: description
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
            <button type="button" onClick={onClose} className="modal-cancel-btn">취소</button>
            <button type="submit" className="modal-submit-btn">생성</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const calculateDday = (dateString) => {
    if (!dateString) return '미설정';
    
    const targetDate = new Date(dateString);
    const today = new Date();
    const diff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    
    if (diff > 0) {
      return `D-${diff}`;
    } else if (diff === 0) {
      return 'D-Day';
    } else {
      return `D+${Math.abs(diff)}`;
    }
  };

  const MainPage = () => {
    const navigate = useNavigate();

    const handleLogout = (e) => {
      e.preventDefault();
      navigate('/login');
    };
    const [projects, setProjects] = React.useState([]);
    const [selectedProject, setSelectedProject] = React.useState(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = React.useState(false);
    const [isAlarmMenuOpen, setIsAlarmMenuOpen] = React.useState(false);
    const [alarmCount, setAlarmCount] = React.useState(0);
    const [selectedTab, setSelectedTab] = React.useState('메인');

    let details;
    
    if (projects.length > 0 && selectedProject !== null) {
      details = {
        메인: {
          title: '프로젝트 현황',
          content: [
            { label: 'D-Day', value: ` : ${projects[selectedProject]?.dDay && calculateDday(projects[selectedProject].dDay) || '미설정'}` },
            { label: '프로젝트 설명', value: ` : ${projects[selectedProject]?.description || '설명이 없습니다'}` },
            { label: '진행률', value: ` : 75%` },
            { label: '최근 업데이트', value: ` : 2025-05-01` },
            { label: '참여 인원', value: ` : 4명` },
            { label: '활동 시간', value: ` : 45시간` }
          ]
        },
        업무: {
          title: '업무 현황',
          content: [
            { label: '진행 중인 업무', value: ` : 3개` },
            { label: '완료된 업무', value: ` : 12개` },
            { label: '예정된 업무', value: ` : 5개` }
          ]
        },
        로그: {
          title: '로그',
          content: [
            { label: '최근 업데이트', value: ` : 2025-05-01` },
            { label: '참여 인원', value: ` : 4명` },
            { label: '활동 내용', value: ` : 45시간` }
          ]
        },
        알람: {
          title: '알림',
          content: [
            { label: '업무 마감일 알림', value: ` : ON` },
            { label: '회의 알림', value: ` : ON` },
            { label: '업데이트 알림', value: ` : ON` }
          ]
        },
        사용자: {
          title: '사용자',
          content: [
            { label: '사용자 이름', value: ` : 김철수` },
            { label: '사용자 권한', value: ` : 관리자` }
          ]
        }
      };
    }

    // Save projects to localStorage whenever they change
    React.useEffect(() => {
      localStorage.setItem('projects', JSON.stringify(projects));
    }, [projects]);

    const toggleAccountMenu = () => {
      setIsAccountMenuOpen(!isAccountMenuOpen);
      setIsAlarmMenuOpen(false);
    };

    const toggleAlarmMenu = () => {
      setIsAlarmMenuOpen(!isAlarmMenuOpen);
      setIsAccountMenuOpen(false);
    };

    const handleCreateProject = (projectData) => {
      // Convert all projects to objects if they're not already
      const updatedProjects = projects.map((project, index) => {
        if (typeof project === 'string') {
          return {
            name: project,
            dDay: '',
            description: ''
          };
        }
        return project;
      });

      // Add the new project
      const newProject = {
        name: projectData.name,
        dDay: projectData.dDay || '',
        description: projectData.description || ''
      };
      setProjects([...updatedProjects, newProject]);
      setIsModalOpen(false);

      setProjects([
        ...updatedProjects,
        {
          name: projectData.name,
          dDay: projectData.dDay,
          description: projectData.description
        }
      ]);
    };

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const handleDeleteProject = () => {
      console.log(projects.length);
      if(projects.length === 0 || selectedProject === null){
        alert('프로젝트가 없습니다.');
        return;
      }
      if(window.confirm('프로젝트를 삭제하시겠습니까?')) {
        const newProjects = projects.filter((_, index) => index !== selectedProject);
        setProjects(newProjects);
        if (newProjects.length > 0) {
            setSelectedProject(0);
          } else {
            setSelectedProject(null);
          }
        alert('프로젝트가 삭제되었습니다.');
      }else{
        alert('프로젝트 삭제를 취소하였습니다.');
      }
    };

    return (
      <div>
        <div className="main-container">
          <div className="content-wrapper">
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
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>프로젝트 목록</h2>
          </div>
          <nav className="sidebar-nav">
            <ul>
              {projects.map((project, index) => (
                <li key={index} className={index === selectedProject ? 'active' : ''}>
                  <a className="sidebar-link" style={{ cursor: 'pointer' }} onClick={() => setSelectedProject(index)}>
                    {typeof project === 'string' ? project : project.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="sidebar-buttons">
            <button className="sidebar-btn primary" onClick={openModal}>프로젝트 <br />생성</button>
            <button className="sidebar-btn secondary" onClick={handleDeleteProject}>프로젝트 <br />삭제</button>
          </div>
        </aside>
        <div className="main-content">
          {projects.length > 0 && (
            <h1 className="project-title">{selectedProject !== null && projects[selectedProject] ? (typeof projects[selectedProject] === 'string' ? projects[selectedProject] : projects[selectedProject].name) : '프로젝트를 선택하세요'}</h1>
          )}
          <div className="content-container">
            {projects.length > 0 ? (
              <div className="project-info">
                {selectedProject !== null && (
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
                )}
                {projects.length > 0 && selectedProject !== null && projects[selectedProject] && (
                  <div className="project-details-content">
                    <h2>{details[selectedTab]?.title || '메인'}</h2>
                    <div className="details-grid">
                      {details[selectedTab]?.content?.map((item, index) => (
                        <div key={index} className="detail-item">
                          <span className="label">{item.label}</span>
                          <span className="value">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
    </div>
    <ProjectModal 
      isOpen={isModalOpen} 
      onClose={closeModal} 
      onSubmit={handleCreateProject} 
    />
  </div>);
};

export default MainPage;
