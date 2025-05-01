import React from 'react';
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

const MainPage = () => {
  const [projects, setProjects] = React.useState(['프로젝트 1']);
  const [selectedProject, setSelectedProject] = React.useState(0);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = React.useState(false);

  const toggleAccountMenu = () => {
    setIsAccountMenuOpen(!isAccountMenuOpen);
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

  const handleCreateProject = (projectData) => {
    // If the first project is a string, convert it to an object
    const updatedProjects = projects.map((project, index) => {
      if (index === 0 && typeof project === 'string') {
        return {
          name: project,
          dDay: '',
          description: ''
        };
      }
      return project;
    });

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
              <a href="/signup" className="auth-link">Sign Up</a>
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
                  <a href="/" className="sidebar-link" onClick={() => setSelectedProject(index)}>
                    {typeof project === 'string' ? project : project.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="sidebar-buttons">

            <button className="sidebar-btn primary" onClick={openModal}>Create project</button>
            <button className="sidebar-btn secondary" onClick={handleDeleteProject}>delete project</button>
          </div>
        </aside>
        <div className="main-content">
          {selectedProject !== null && (
            <div className="project-info">
              <h1>{typeof projects[selectedProject] === 'string' ? projects[selectedProject] : projects[selectedProject].name}</h1>
              {typeof projects[selectedProject] !== 'string' && (
                <div className="project-details">
                  <div className="d-day">
                    <h3>D-Day</h3>
                    <p>{calculateDday(projects[selectedProject].dDay)}</p>
                  </div>
                  <div className="description">
                    <h3>프로젝트 설명</h3>
                    <p>{projects[selectedProject].description || '설명이 없습니다'}</p>
                  </div>
                </div>
              )}
            </div>
          )}
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
