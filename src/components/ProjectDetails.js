import React from 'react';

const ProjectDetails = ({ type, project }) => {
  const details = {
    업무: {
      title: '업무 현황',
      content: [
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
  };

  const currentDetails = details[type] || details.업무;

  return (
    <div className="project-details-content">
      <h2>{currentDetails.title}</h2>
      <div className="details-grid">
        {currentDetails.content.map((item, index) => (
          <div key={index} className="detail-item">
            <span className="label">{item.label}</span>
            <span className="value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectDetails;
