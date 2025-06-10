import React, { useState, useEffect } from "react";
import "./styles/profile.css";

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
  const userId = localStorage.getItem("user_id"); // 로그인 시 저장했다고 가정

  fetch(`http://localhost:5000/api/profile?user_id=${userId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      setUserData(data);
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
