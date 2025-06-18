import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from './api/axios.js'; // axios 경로 확인
import './styles/ResetPasswordPage.css'; // 방금 만든 CSS 파일 import

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' 또는 'error'
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가

  const { token } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessageType('');
    setMessage('');

    if (password !== confirmPassword) {
      setMessageType('error');
      setMessage('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 6) {
      setMessageType('error');
      setMessage('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true); // 로딩 시작

    try {
      const response = await axios.post(`/api/reset-password/${token}`, { password });
      setMessageType('success');
      setMessage(response.data.message + ' 3초 후 로그인 페이지로 이동합니다.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setMessageType('error');
      setMessage(error.response?.data?.error || '오류가 발생했습니다.');
    } finally {
      setIsLoading(false); // 로딩 종료
    }
  };

  return (
    <div className="reset-password-container">
      <div className="reset-password-box">
        <h2>새 비밀번호 설정</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="new-password">새 비밀번호</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상 입력"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="confirm-password">새 비밀번호 확인</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="다시 한번 입력"
              required
            />
          </div>
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
        {message && (
          <p className={`message-area ${messageType}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;