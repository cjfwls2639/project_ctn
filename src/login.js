import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './login.css';

function Login() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // 여기에 실제 로그인 로직을 구현하세요
    console.log('로그인 시도:', { id, password });
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    // 성공 시
    setError('');
    // 여기에 실제 로그인 API 호출을 추가하세요
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
          <button className='google-login-button' >구글 로그인</button>
          <button className="login-register-link">
            <Link to="/register">회원가입</Link>
          </button>  
        </div>
      </div>
    </div>
  );
}

export default Login;