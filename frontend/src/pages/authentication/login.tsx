import React from 'react';
import '../../styles/LoginPage.css';

interface LoginPageProps {
  onLogin: (role: 'admin' | 'user') => void;
  onShowRegistration: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onShowRegistration }) => (
  <div className="login-container">
    <div className="login-card">
      <h1>EFBC Conference Portal</h1>
      <p>Please select your role to proceed.</p>
      <div className="login-actions">
        <button className="btn btn-primary" onClick={() => onLogin("admin")}>Login as Admin</button>
        <button className="btn btn-secondary" onClick={() => onLogin("user")}>Login as User</button>
      </div>
      <div className="login-link">
        <p>
          New to EFBC?{' '}
          <button 
            type="button"
            className="link-button"
            onClick={onShowRegistration}
          >
            Create an account
          </button>
        </p>
      </div>
    </div>
  </div>
);
