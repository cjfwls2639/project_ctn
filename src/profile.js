import React, { useState, useEffect } from "react";
import "./styles/profile.css";
import axios from "./api/axios";

const Profile = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    // 컴포넌트가 렌더링될 때 사용자 정보를 불러오는 함수
    const fetchUserProfile = async () => {
      try {
        // --- 여기가 핵심! ---
        // 1. localStorage에서 'user'라는 키로 저장된 데이터를 가져옵니다.
        const storedUserJSON = localStorage.getItem("user");

        if (!storedUserJSON) {
          console.error("로그인 정보가 없습니다.");
          // 실제 애플리케이션에서는 로그인 페이지로 리디렉션
          return;
        }

        // 2. 가져온 데이터는 JSON 문자열이므로, Javascript 객체로 변환(parse)합니다.
        const storedUser = JSON.parse(storedUserJSON);

        // 3. 변환된 객체에서 user_id 값을 추출합니다.
        const userId = storedUser.user_id;

        if (!userId) {
          console.error("사용자 ID를 찾을 수 없습니다.");
          return;
        }

        // 4. 추출한 userId를 URL에 포함시켜 API를 호출합니다.
        //    템플릿 리터럴(백틱 ``)을 사용하면 변수를 문자열에 쉽게 넣을 수 있습니다.
        const response = await axios.get(`/api/users/${userId}`);

        // 5. 서버로부터 받은 사용자 프로필 정보를 state에 저장합니다.
        setUserProfile(response.data);
      } catch (err) {
        console.error("프로필 정보를 불러오는 데 실패했습니다:", err);
      } finally {
        setLoading(false); // 로딩 상태 종료
      }
    };

    fetchUserProfile();
  }, []);

  const handleForgotPassword = async () => {
    // 로그인된 사용자의 이메일을 가져옵니다 (state나 context에서).
    const emailJSON = localStorage.getItem("user"); 
    const email = JSON.parse(emailJSON).email;
    
    if (!email) {
      alert("이메일 정보가 없습니다.");
      return;
    }

    setIsSendingEmail(true);
  
    try {
      const response = await axios.post('/api/forgot-password', { email });
      alert(response.data.message);
    } catch (error) {
      alert("오류가 발생했습니다. 다시 시도해주세요.");
    }
    setIsSendingEmail(false);
  };

  return (
    <div className="profile-container">
      <div className="profile-box">
        <h2>프로필 정보</h2>

        {error && <div className="profile-error-message">{error}</div>}

        {userProfile ? (
          <>
            <div className="profile-info">
              <label>이름:</label>
              <span>{userProfile.username}</span>
            </div>
            <div className="profile-info">
              <label>이메일:</label>
              <span>{userProfile.email}</span>
            </div>
            <div className="profile-info">
              <label>가입 날짜:</label>
              <span>
                {new Date(userProfile.created_at).toLocaleDateString()}
              </span>
            </div>
          </>
        ) : (
          !error && <p>로딩 중...</p>
        )}

        <button className="profile-button" onClick={handleForgotPassword} disabled={isSendingEmail}>
          {isSendingEmail ? '비밀 번호 변경 이메일 보내는 중...' : '비밀번호 변경 이메일 받기'}
        </button>
      </div>
    </div>
  );
};

export default Profile;
