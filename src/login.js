// src/Login.js

import React, { useState, useEffect, useRef } from "react"; // useEffect, useRef 추가
import { useNavigate } from "react-router-dom";
import axios from "./api/axios"; // 우리가 만든 axios 인스턴스 import
import "./styles/login.css";

// Google OAuth 클라이언트 ID를 여기에 입력하세요.
// 이 ID는 Google Cloud Console에서 생성한 웹 애플리케이션 유형의 클라이언트 ID와 동일해야 합니다.
const GOOGLE_CLIENT_ID = '943180922128-8ue7tfmovcfakjhfu42gf65mscrcejqt.apps.googleusercontent.com'; // TODO: 실제 Google 클라이언트 ID로 변경하세요!

function Login() {
  const navigate = useNavigate();
  // --- CHANGED: 'id' state를 'username'으로 변경하여 백엔드와 일치시킵니다.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // --- NEW: 로딩 상태 추가

  // Google 로그인 버튼을 렌더링할 div 요소에 대한 ref
  const googleButtonRef = useRef(null);

  // Google Identity Services (GIS) 스크립트 로드 및 초기화
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      // GIS 라이브러리가 로드되면 초기화
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse, // 인증 응답을 처리할 콜백 함수
          cancel_on_tap_outside: false, // One Tap 시 바깥 클릭으로 닫히지 않도록 설정 (선택 사항)
        });

        // Google 로그인 버튼 렌더링
        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(
            googleButtonRef.current,
            { theme: "outline", size: "large", text: "signin_with", width: 300 } // width: "100%" 대신 픽셀 값 사용 (콘솔 경고 방지)
          );
          console.log('Google Sign-In button rendered.');
        } else {
          console.warn('Google button ref is not available, cannot render button.');
        }
        
        // One Tap 또는 자동 로그인 사용을 원하면 주석 해제:
        // window.google.accounts.id.prompt(); 

      } else {
        console.error('Google Identity Services (GIS) script failed to load.');
        setError('Google 로그인 초기화 중 오류가 발생했습니다. (GIS 로드 실패)');
      }
    };

    script.onerror = () => {
      console.error('Failed to load Google Identity Services script.');
      setError('Google 로그인 스크립트를 로드하는 데 실패했습니다. 네트워크 상태를 확인하세요.');
    };

    // 컴포넌트 언마운트 시 스크립트 제거 (선택 사항)
    return () => {
      document.body.removeChild(script);
      if (window.google && window.google.accounts && window.google.accounts.id) {
         window.google.accounts.id.cancel(); // GIS 세션 정리
      }
    };
  }, []); // 컴포넌트 마운트 시 한 번만 실행되도록 빈 배열 전달

  // Google 인증 응답 처리 콜백 함수
  const handleGoogleCredentialResponse = async (response) => {
    // console.log("Encoded ID Token:" + response.credential); // 디버깅용
    setError(""); // 이전 에러 메시지 초기화
    setLoading(true); // 로딩 시작

    try {
      // 백엔드로 Google ID 토큰 전송
      // 백엔드 URL이 http://localhost:5000 이라고 가정
      const backendResponse = await fetch('http://localhost:5000/auth/google', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: response.credential }), // 'credential' 필드에 ID 토큰이 포함됨
      });

      const data = await backendResponse.json(); // 백엔드 응답 파싱

      if (backendResponse.ok) {
        // 백엔드로부터 받은 사용자 정보와 JWT 토큰 저장
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        console.log('Google login successful:', data);
        navigate("/main"); // 로그인 성공 시 메인 페이지로 이동
      } else {
        // 백엔드에서 에러 응답을 보낸 경우
        setError(`Google 로그인 실패: ${data.message || '알 수 없는 오류'}`);
        console.error('Google login failed:', data);
      }
    } catch (error) {
      // 네트워크 오류 또는 기타 예외
      console.error('Google login error:', error);
      setError('Google 로그인 처리 중 네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false); // 로딩 종료
    }
  };

  // 일반 로그인 핸들러 (기존 코드 유지)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // 이전 에러 메시지 초기화
    setLoading(true); // 로딩 시작

    if (!username || !password) {
      setError("아이디와 비밀번호를 모두 입력해주세요.");
      setLoading(false);
      return;
    }

    try {
      // 백엔드의 /api/login으로 username과 password를 담아 POST 요청
      const response = await axios.post("/api/login", {
        username, // username: username 과 동일
        password, // password: password 와 동일
      });

      // 로그인 성공
      console.log("로그인 성공:", response.data);

      // 로그인 성공 후 받은 사용자 정보와 토큰을 localStorage에 저장합니다.
      localStorage.setItem("user", JSON.stringify(response.data.user)); // 백엔드 응답 구조에 맞춤
      localStorage.setItem("token", response.data.token); // 백엔드 응답 구조에 맞춤

      // 메인 페이지로 이동
      navigate("/main");
    } catch (err) {
      // 로그인 실패
      console.error("로그인 실패:", err);
      if (err.response) {
        // 서버가 에러 응답을 보낸 경우 (예: 아이디/비밀번호 불일치)
        // 백엔드에서 보낸 에러 메시지를 가져와서 상태에 저장합니다.
        setError(
          err.response.data.error || "아이디 또는 비밀번호가 올바르지 않습니다."
        );
      } else {
        // 네트워크 에러 등 서버와 아예 통신이 안 된 경우
        setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLoading(false); // 로딩 종료 (성공/실패 여부와 관계없이)
    }
  };

  return (
    <div className="login-container">
      <h1 className="login-title">to Be Continew</h1>
      <div className="login-box">
        <h2>로그인</h2>
        {/* 에러 메시지가 있을 경우에만 표시 */}
        {error && <div className="login-error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-insert-form">
            <div className="login-form-group">
              <label htmlFor="username">아이디</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
        <hr />
        <div className="button-container">
          {/* Google GIS 버튼이 렌더링될 div 요소 */}
          {/* Google 로그인 중일 때는 버튼을 숨깁니다. */}
          <div ref={googleButtonRef} className="google-login-button" style={{ display: loading ? 'none' : 'block' }}></div>
          <button
            className="login-register-link"
            onClick={() => navigate("/register")}
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;

