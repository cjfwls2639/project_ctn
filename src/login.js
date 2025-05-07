import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './login.css';

function Login() {
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('로그인 시도:', { id, password });
    
    // 특수문자 정규식 (영문, 숫자, 공백을 제외한 문자)
    const specialCharRegex = /[^\w\s]/;
    if (password.length < 8 || !specialCharRegex.test(password)) {
      setError('비밀번호는 8자 이상, 특수문자를 포함하여야 합니다.');
      return;
    }
    
    setError('');
    // 로그인 성공 시 메인 페이지로 이동
    navigate('/');
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>로그인</h2>
        {error && <div className="login-error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <div className='login-insert-form'>
            <div className="login-form-group">
              <label htmlFor="id">아이디</label>
              <input
                type="id"
                id="id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
              />
            </div>
            <div className="login-form-group">
              <label htmlFor="password">비밀번호</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="login-button">
            로그인
          </button>
        </form>
        <hr />
        <div className="button-container">
          <button className='google-login-button'>구글 로그인</button>
          <button 
            className="login-register-link"
            onClick={() => navigate('/register')}
          >
            회원가입
          </button>  
        </div>
      </div>
    </div>
  );
}

export default Login;