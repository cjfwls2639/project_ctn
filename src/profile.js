import React, { useState, useEffect } from "react";
import axios from "axios";
import "./profile.css"; 

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 사용자 정보를 가져오는 API 요청
    axios.get("http://localhost:5000/api/profile")
      .then(response => {
        setUserData(response.data);
      })
      .catch(error => {
        setError("프로필 정보를 불러오는 데 실패했습니다.");
        console.error("Error fetching profile data:", error);
      });
  }, []);

  return (
    <div className="profile-container">
      <div className="profile-box">
        <h2>프로필 정보</h2>

        {error && <div className="profile-error-message">{error}</div>}

        {userData ? (
          <>
            <div className="profile-info">
              <label>이름:</label>
              <span>{userData.name}</span>
            </div>
            <div className="profile-info">
              <label>이메일:</label>
              <span>{userData.email}</span>
            </div>
            <div className="profile-info">
              <label>가입 날짜:</label>
              <span>{new Date(userData.createdAt).toLocaleDateString()}</span>
            </div>
          </>
        ) : (
          !error && <p>로딩 중...</p>
        )}

        <button className="profile-button">프로필 수정</button>
      </div>
    </div>
  );
};

export default Profile;
