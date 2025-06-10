// src/Register.js

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// './api/axios.js'는 baseURL이 설정된 우리가 만든 axios 인스턴스입니다.
import axios from "./api/axios.js";
import "./styles/Register.css";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // 입력이 변경되면 해당 필드의 에러는 지워주는 것이 사용자 경험에 좋습니다.
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    // ... validateForm 함수는 기존과 동일합니다.
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "사용자 이름은 필수입니다.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "이메일은 필수입니다.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "올바른 이메일 형식을 입력해주세요.";
      }
    }

    if (!formData.password.trim()) {
      newErrors.password = "비밀번호는 필수입니다.";
    } else {
      const specialCharRegex = /[^\w\s]/; // 간소화된 특수문자 체크
      if (
        formData.password.length < 8 ||
        !specialCharRegex.test(formData.password)
      ) {
        newErrors.password = "비밀번호는 8자 이상, 특수문자를 포함해야 합니다.";
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }

    return newErrors;
  };

  // --- CHANGED: handleSubmit 함수 수정 ---
  const handleSubmit = async (e) => {
    // async 키워드 추가
    e.preventDefault();
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true); // 로딩 시작
    setErrors({}); // 이전 에러 메시지 초기화

    try {
      // API 호출: 백엔드 서버의 /api/register 엔드포인트로 POST 요청을 보냅니다.
      // body에는 username, email, password를 담아 보냅니다.
      // confirmPassword는 프론트엔드 유효성 검사에서만 필요하므로 보내지 않습니다.
      const response = await axios.post("/api/register", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      // 회원가입 성공
      console.log("회원가입 성공:", response.data);
      alert(
        response.data.message ||
          "회원가입에 성공했습니다! 로그인 페이지로 이동합니다."
      );

      // 회원가입 성공 시 로그인 페이지로 이동
      navigate("/login");
    } catch (error) {
      // API 호출 실패
      console.error("회원가입 실패:", error);
      if (error.response) {
        // 서버가 에러 응답을 보낸 경우 (예: 중복된 아이디)
        // 백엔드에서 보낸 에러 메시지를 화면에 표시합니다.
        // 예를 들어, { error: '이미 존재하는 사용자 이름 또는 이메일입니다.' }
        const errorMessage = error.response.data.error;
        alert(errorMessage || "회원가입 중 오류가 발생했습니다.");

        // 특정 필드에 대한 에러를 표시할 수도 있습니다.
        if (errorMessage.includes("사용자 이름")) {
          setErrors({ username: errorMessage });
        } else if (errorMessage.includes("이메일")) {
          setErrors({ email: errorMessage });
        }
      } else {
        // 네트워크 에러 등 서버와 통신 자체가 실패한 경우
        alert("서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLoading(false); // 로딩 종료
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>회원가입</h2>
        <form onSubmit={handleSubmit} noValidate>
          {" "}
          {/* noValidate: 브라우저 기본 유효성 검사 끄기 */}
          {/* ... 폼 입력 필드들은 기존과 동일 ... */}
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
            {errors.username && (
              <div className="register-error-message">{errors.username}</div>
            )}
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
            {errors.email && (
              <div className="register-error-message">{errors.email}</div>
            )}
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
            {errors.password && (
              <div className="register-error-message">{errors.password}</div>
            )}
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
            {errors.confirmPassword && (
              <div className="register-error-message">
                {errors.confirmPassword}
              </div>
            )}
          </div>
          {/* --- CHANGED: 로딩 상태에 따라 버튼 비활성화 --- */}
          <button type="submit" className="register-button" disabled={loading}>
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>
        <div className="login-link">
          이미 회원이신가요?{" "}
          <button
            className="login-link-button"
            onClick={() => navigate("/login")}
          >
            로그인
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;
