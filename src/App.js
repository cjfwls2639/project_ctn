import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './login';
import Register from './Register';
import MainPage from './MainPage';
import Profile from './profile';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/main" replace />} /> //개발하는 동안 바로 메인가도록 해놓음
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  );
}

export default App;