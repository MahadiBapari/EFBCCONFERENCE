import React, { useState } from 'react';
import '../../styles/LoginPage.css';
import { authApi } from '../../services/apiClient';

interface LoginPageProps {
  onLogin: (role: 'admin' | 'user') => void;
  onShowRegistration: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onShowRegistration }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const data = res.data || res; // apiClient returns {success,data}
      const token = data.token || (data.data && data.data.token);
      const user = data.user || (data.data && data.data.user);
      if (!token || !user) throw new Error('Invalid response');
      localStorage.setItem('token', token);
      onLogin(user.role);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>EFBC Conference Portal</h1>
        <p>Sign in to continue.</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div className="error-message" style={{ marginBottom: '0.5rem' }}>{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>
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
};
