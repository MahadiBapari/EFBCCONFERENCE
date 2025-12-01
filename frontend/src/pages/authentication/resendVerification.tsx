import React, { useState, useEffect } from 'react';
import '../../styles/LoginPage.css';
import { authApi } from '../../services/apiClient';
import apiClient from '../../services/apiClient';

const ResendVerificationPage: React.FC = () => {
  // Get query parameters from URL
  const getQueryParam = (name: string): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  };
  
  const emailFromUrl = getQueryParam('email') || '';
  const expired = getQueryParam('expired') === 'true';
  const invalid = getQueryParam('invalid') === 'true';
  
  const [email, setEmail] = useState(emailFromUrl);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(!!emailFromUrl);

  useEffect(() => {
    // Check verification status if email is provided in URL
    if (emailFromUrl) {
      checkVerificationStatus(emailFromUrl);
    }
  }, [emailFromUrl]);

  const checkVerificationStatus = async (emailToCheck: string) => {
    setChecking(true);
    try {
      const response = await apiClient.get(`/auth/resend-verification?email=${encodeURIComponent(emailToCheck)}`);
      const data = (response as any).data || response;
      if (data.verified) {
        setMessage('Your email is already verified. You can now log in.');
        setTimeout(() => {
          window.location.href = '/login?verified=true';
        }, 2000);
      }
    } catch (e) {
      // Ignore errors, just proceed
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      await authApi.resendVerification(email);
      setMessage('Verification email sent successfully! Please check your inbox and click the verification link.');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to resend verification email';
      if (err?.response?.status === 404) {
        setError('No account found with this email address.');
      } else if (err?.response?.status === 400) {
        setError(msg);
      } else {
        setError(msg || 'Failed to resend verification email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Resend Verification Email</h1>
        </div>
        
        {expired && (
          <div className="alert alert-warning" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', color: '#856404' }}>
            Your verification link has expired. Please request a new one below.
          </div>
        )}
        
        {invalid && (
          <div className="alert alert-warning" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', color: '#856404' }}>
            The verification link is invalid. Please request a new verification email below.
          </div>
        )}

        {checking && (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <p>Checking verification status...</p>
          </div>
        )}

        {message && (
          <div className="alert alert-success" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px', color: '#155724' }}>
            {message}
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', color: '#721c24' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              disabled={loading}
              className="form-control"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !email}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {loading ? 'Sending...' : 'Resend Verification Email'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.875rem', color: '#666' }}>
            Remember your password?{' '}
            <a href="/login" style={{ color: '#3B82F6', textDecoration: 'none' }}>
              Back to Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResendVerificationPage;

