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
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

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
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || '';
      if (status === 401 || /invalid credentials/i.test(msg)) {
        setError('Wrong email or password');
      } else {
        setError(msg || 'Login failed');
      }
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
            <div className="input-with-action">
              <input id="password" type={showPassword ? 'text' : 'password'} className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" className="inline-action" onClick={()=>setShowPassword(s=>!s)} aria-label="Toggle password visibility">
                {showPassword ? (
                  // Eye icon when visible
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  // Eye-off icon when hidden
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-6.94"/>
                    <path d="M1 1l22 22"/>
                    <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'right', marginTop: '-0.5rem', marginBottom: '1.75rem' }}>
            <button type="button" className="link-button" onClick={()=>{ setForgotOpen(true); setForgotEmail(email); setForgotMsg(''); }}>Forgot password?</button>
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
      {forgotOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Reset Password</h3>
            <p>Enter your account email and we’ll send a reset link.</p>
            <input type="email" className="form-control" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="you@example.com" />
            {forgotMsg && <div className="info-message" style={{ marginTop: '8px' }}>{forgotMsg}</div>}
            <div style={{ display:'flex', gap:'0.5rem', marginTop:'12px' }}>
              <button className="btn btn-primary" onClick={async()=>{
                try {
                  const em = (forgotEmail||'').trim();
                  if(!em) { setForgotMsg('Email is required'); return; }
                  await authApi.forgotPassword(em);
                  setForgotMsg('If an account exists, a reset link has been sent.');
                } catch(e:any){ setForgotMsg(e?.response?.data?.error || 'Request failed'); }
              }}>Send Reset Link</button>
              <button className="btn btn-secondary" onClick={()=>setForgotOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
