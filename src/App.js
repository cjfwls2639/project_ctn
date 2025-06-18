import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage'
import Login from './login';
import Register from './Register';
import MainPage from './MainPage';
import Profile from './profile';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} /> 
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      </Routes>
    </Router>
  );
}

export default App;