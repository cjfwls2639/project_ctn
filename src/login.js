import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "./api/axios"; // 우리가 만든 axios 인스턴스 import
import "./styles/login.css";

function Login() {
  const navigate = useNavigate();
  // --- CHANGED: 'id' state를 'username'으로 변경하여 백엔드와 일치시킵니다.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // --- NEW: 로딩 상태 추가

  // --- CHANGED: handleSubmit 함수를 API 호출 로직으로 수정 ---
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

      // --- 중요 ---
      // 로그인 성공 후 받은 사용자 정보를 localStorage에 저장합니다.
      // 이 정보는 다른 페이지(예: MainPage)에서 '내가 누구인지'를 증명하고,
      // 내 프로젝트 목록을 불러오는 등의 API 요청에 사용됩니다.
      localStorage.setItem("user", JSON.stringify(response.data));

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
              {/* --- CHANGED: 'for'와 'id'를 'username'으로 변경 */}
              <label htmlFor="username">아이디</label>
              <input
                type="text" // 'id' 타입은 없으므로 'text'로 변경
                id="username"
                value={username}
                // --- CHANGED: setUsername으로 상태 업데이트
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
          {/* --- CHANGED: 로딩 중일 때 버튼 비활성화 */}
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
        <hr />
        <div className="button-container">
          <button className="google-login-button">구글 로그인</button>
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
