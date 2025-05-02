import React, { useState } from 'react';
import './MainPage.css';
import './components/Sidebar.css';
import './components/NavigationBar.css';
import './components/MainContent.css';

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
    const [projects, setProjects] = React.useState([]);
    const [selectedProject, setSelectedProject] = React.useState(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = React.useState(false);
    const [selectedTab, setSelectedTab] = React.useState('업무');

    const details = projects.length > 0 && selectedProject !== null ? {
      업무: {
        title: '업무 현황',
        content: [
          { label: 'D-Day', value: projects[selectedProject]?.dDay ? calculateDday(projects[selectedProject].dDay) : '미설정' },
          { label: '프로젝트 설명', value: projects[selectedProject]?.description || '설명이 없습니다' },
          { label: '진행 중인 업무', value: '3개' },
          { label: '완료된 업무', value: '12개' },
          { label: '예정된 업무', value: '5개' }
        ]
      },
      활동로그: {
        title: '최근 활동',
        content: [
          { label: '최근 업데이트', value: '2025-05-01' },
          { label: '참여 인원', value: '4명' },
          { label: '활동 시간', value: '45시간' }
        ]
      },
      대시보드: {
        title: '프로젝트 통계',
        content: [
          { label: '진행률', value: '75%' },
          { label: '예산 사용률', value: '60%' },
          { label: '남은 시간', value: '30일' }
        ]
      },
      알람: {
        title: '알림 설정',
        content: [
          { label: '업무 마감일 알림', value: 'ON' },
          { label: '회의 알림', value: 'ON' },
          { label: '업데이트 알림', value: 'ON' }
        ]
      }
    } : {
      업무: {
        title: '업무 현황',
        content: [
          { label: '프로젝트를 선택하세요', value: '-' }
        ]
      },
      활동로그: {
        title: '최근 활동',
        content: [
          { label: '프로젝트를 선택하세요', value: '-' }
        ]
      },
      대시보드: {
        title: '프로젝트 통계',
        content: [
          { label: '프로젝트를 선택하세요', value: '-' }
        ]
      },
      알람: {
        title: '알림 설정',
        content: [
          { label: '프로젝트를 선택하세요', value: '-' }
        ]
      }
    };

    // Save projects to localStorage whenever they change
    React.useEffect(() => {
      localStorage.setItem('projects', JSON.stringify(projects));
    }, [projects]);

    const toggleAccountMenu = () => {
      setIsAccountMenuOpen(!isAccountMenuOpen);
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
      if (projects.length > 1) { // 최소 1개의 프로젝트는 유지
        const newProjects = projects.filter((_, index) => index !== selectedProject);
      setProjects(newProjects);
      setSelectedProject(0); // 첫 번째 프로젝트로 선택
    }
  };

  return (
    <div className="main-container">
      <div className="content-wrapper">
        <nav className="navbar">
          <div className="navbar-brand">
            <h1>To Be Continew</h1>
          </div>
          <div className="auth-dropdown" onClick={toggleAccountMenu}>
            <button className="auth-btn">Account <span className="caret">▼</span></button>
            <div className="auth-menu" style={{ display: isAccountMenuOpen ? 'block' : 'none' }}>
              <a href="/login" className="auth-link">Login</a>
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
                </div>
                {projects.length > 0 && selectedProject !== null && projects[selectedProject] && (
                  <div className="project-details-content">
                    <h2>{details[selectedTab]?.title || '업무 현황'}</h2>
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
      <ProjectModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        onSubmit={handleCreateProject} 
      />
    </div>
  );
};

export default MainPage;
