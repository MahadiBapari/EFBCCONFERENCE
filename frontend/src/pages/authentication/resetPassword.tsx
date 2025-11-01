import React, { useMemo, useState } from 'react';
import '../../styles/LoginPage.css';
import { authApi } from '../../services/apiClient';

export const ResetPasswordPage: React.FC = () => {
  const qs = new URLSearchParams(window.location.search);
  const token = qs.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const valid = useMemo(() => {
    return (
      token.length > 0 &&
      password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password) &&
      confirm === password
    );
  }, [token, password, confirm]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!valid) {
      setError('Please provide a strong password and ensure both fields match.');
      return;
    }
    try {
      setLoading(true);
      await authApi.resetPassword({ token, newPassword: password });
      setMessage('Password updated. You can sign in with your new password.');
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Reset Password</h1>
        <p>Choose a strong new password for your account.</p>
        <form onSubmit={onSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="np">New Password</label>
            <div className="input-with-action">
              <input id="np" type={showPass ? 'text' : 'password'} className="form-control" value={password} onChange={e=>setPassword(e.target.value)} required />
              <button type="button" className="inline-action" onClick={()=>setShowPass(s=>!s)} aria-label="Toggle password visibility">
                {showPass ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-6.94"/>
                    <path d="M1 1l22 22"/>
                    <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="cp">Confirm New Password</label>
            <div className="input-with-action">
              <input id="cp" type={showConfirm ? 'text' : 'password'} className="form-control" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
              <button type="button" className="inline-action" onClick={()=>setShowConfirm(s=>!s)} aria-label="Toggle confirm password visibility">
                {showConfirm ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-6.94"/>
                    <path d="M1 1l22 22"/>
                    <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          {error && <div className="error-message" style={{ marginBottom: '0.5rem' }}>{error}</div>}
          {message && <div className="info-message" style={{ marginBottom: '0.5rem' }}>{message}</div>}
          <button type="submit" className="btn btn-primary" disabled={!valid || loading}>{loading ? 'Updating...' : 'Update Password'}</button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;


