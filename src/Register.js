import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Register.css';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = '사용자 이름은 필수입니다.';
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일은 필수입니다.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = '올바른 이메일 형식을 입력해주세요.';
      }
    }

    if (!formData.password.trim()) {
      newErrors.password = '비밀번호는 필수입니다.';
    } else {
      const specialCharRegex = /[^\w\s]/;
      if (formData.password.length < 8 || !specialCharRegex.test(formData.password)) {
        newErrors.password = '비밀번호는 8자 이상, 특수문자를 포함하여야 합니다.';
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // 여기에 회원가입 API 호출을 추가하세요
    console.log('회원가입 시도:', formData);
    setErrors({});
    
    // 회원가입 성공 시 로그인 페이지로 이동
    navigate('/login');
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>회원가입</h2>
        <form onSubmit={handleSubmit}>
          <div className="register-form-group">
            <label htmlFor="username">사용자 이름</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            {errors.username && <div className="register-error-message">{errors.username}</div>}
          </div>
          <div className="register-form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {errors.email && <div className="register-error-message">{errors.email}</div>}
          </div>
          <div className="register-form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            {errors.password && <div className="register-error-message">{errors.password}</div>}
          </div>
          <div className="register-form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            {errors.confirmPassword && <div className="register-error-message">{errors.confirmPassword}</div>}
          </div>
          <button type="submit" className="register-button">
            회원가입
          </button>
        </form>
        <div className="login-link">
          이미 회원이신가요?{' '}
          <button 
            className="login-link-button"
            onClick={() => navigate('/login')}
          >
            로그인
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;
