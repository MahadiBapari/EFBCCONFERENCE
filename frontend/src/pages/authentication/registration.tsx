import React, { useState } from 'react';
import { RegisterForm } from '../../types';
import { authApi } from '../../services/apiClient';
import '../../styles/RegistrationPage.css';

interface RegistrationPageProps {
  onRegister: (formData: RegisterForm) => void;
  onBackToLogin: () => void;
}

export const RegistrationPage: React.FC<RegistrationPageProps> = ({ onRegister, onBackToLogin }) => {
  const [formData, setFormData] = useState<RegisterForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Partial<RegisterForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitMessage, setSubmitMessage] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string>('');

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterForm> = {};

    // Name validation
    if (!formData.firstName.trim()) {
      (newErrors as any).firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      (newErrors as any).lastName = 'Last name is required';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitMessage('');
    
    try {
      // Call backend register
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      const res = await authApi.register({ name: fullName, email: formData.email, password: formData.password });
      const payload: any = (res as any).data || res;
      const msg = payload?.message || 'Please check your email to verify your account.';
      setSubmitMessage(msg);
    } catch (error: any) {
      console.error('Registration error:', error);
      // Show detailed validation errors if available
      const errorMsg = error?.response?.data?.error || 'Failed to create account';
      const validationDetails = error?.response?.data?.message;
      const msg = validationDetails ? `${errorMsg}: ${validationDetails}` : errorMsg;
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if ((errors as any)[name as keyof RegisterForm]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined as any
      }));
    }
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (password.length === 0) return { strength: '', color: '' };
    if (password.length < 6) return { strength: 'Weak', color: 'var(--danger-color)' };
    if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { strength: 'Medium', color: '#f59e0b' };
    }
    return { strength: 'Strong', color: 'var(--success-color)' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="registration-container">
      <div className="registration-card">
        <h1>Create Account</h1>
        <p>Join the EFBC Conference Portal</p>
        
        <form className="registration-form" onSubmit={handleSubmit}>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={(formData as any).firstName}
                onChange={handleChange}
                placeholder="Enter your first name"
                required
              />
              {(errors as any).firstName && (
                <div className="error-message">
                  <span>⚠️</span>
                  {(errors as any).firstName}
                </div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={(formData as any).lastName}
                onChange={handleChange}
                placeholder="Enter your last name"
                required
              />
              {(errors as any).lastName && (
                <div className="error-message">
                  <span>⚠️</span>
                  {(errors as any).lastName}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email address"
              required
            />
            {errors.email && (
              <div className="error-message">
                <span>⚠️</span>
                {errors.email}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-action">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                required
              />
              <button type="button" className="inline-action" onClick={()=>setShowPassword(s=>!s)} aria-label="Toggle password visibility">
                {showPassword ? (
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
            {formData.password && (
              <div className="password-requirements">
                <div className={`password-strength ${passwordStrength.strength.toLowerCase()}`}>
                  Password strength: {passwordStrength.strength}
                </div>
                <ul>
                  <li>At least 8 characters long</li>
                  <li>Contains uppercase and lowercase letters</li>
                  <li>Contains at least one number</li>
                </ul>
              </div>
            )}
            {errors.password && (
              <div className="error-message">
                <span>⚠️</span>
                {errors.password}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-with-action">
              <input
                type={showConfirm ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
              />
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
            {errors.confirmPassword && (
              <div className="error-message">
                <span>⚠️</span>
                {errors.confirmPassword}
              </div>
            )}
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <div className="success-message">
                
                Passwords match
              </div>
            )}
          </div>

          {submitMessage && (
            <div className="success-alert">
              <div className="success-alert-content">
                <div className="success-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div className="success-alert-text">
                  <p className="success-alert-title">Account set-up successful!</p>
                  <p className="success-alert-message">{submitMessage}</p>
                </div>
              </div>
              <div className="success-alert-actions">
                <button
                  type="button"
                  className="btn-resend"
                  onClick={async()=>{
                    setResendMsg('');
                    setResending(true);
                    try {
                      const em = (formData.email||'').trim();
                      if(!em){ setResendMsg('Enter your email above first.'); return; }
                      await authApi.resendVerification(em);
                      setResendMsg('Verification email resent successfully!');
                    } catch(e:any){ setResendMsg(e?.response?.data?.error || 'Failed to resend verification'); }
                    finally { setResending(false); }
                  }}
                  disabled={resending}
                >
                  {resending ? (
                    <>
                      <svg className="btn-resend-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="btn-resend-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      Resend Verification Email
                    </>
                  )}
                </button>
                {resendMsg && (
                  <div className={`resend-feedback ${resendMsg.includes('successfully') ? 'resend-success' : 'resend-error'}`}>
                    {resendMsg.includes('successfully') ? (
                      <svg className="resend-feedback-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg className="resend-feedback-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                    )}
                    {resendMsg}
                  </div>
                )}
              </div>
            </div>
          )}
          {submitError && (
            <div className="error-alert">
              <div className="error-alert-content">
                <div className="error-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <div className="error-alert-text">
                  <p>{submitError}</p>
                </div>
              </div>
              <div className="error-alert-actions">
                <button
                  type="button"
                  className="btn-resend btn-resend-error"
                  onClick={async()=>{
                    setResendMsg('');
                    setResending(true);
                    try {
                      const em = (formData.email||'').trim();
                      if(!em){ setResendMsg('Enter your email above first.'); return; }
                      await authApi.resendVerification(em);
                      setResendMsg('If an account exists and is unverified, a verification email has been sent.');
                    } catch(e:any){ setResendMsg(e?.response?.data?.error || 'Failed to resend verification'); }
                    finally { setResending(false); }
                  }}
                  disabled={resending}
                >
                  {resending ? (
                    <>
                      <svg className="btn-resend-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="btn-resend-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      Resend Verification Email
                    </>
                  )}
                </button>
                {resendMsg && (
                  <div className={`resend-feedback ${resendMsg.includes('sent') || resendMsg.includes('successfully') ? 'resend-success' : 'resend-error'}`}>
                    {resendMsg.includes('sent') || resendMsg.includes('successfully') ? (
                      <svg className="resend-feedback-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg className="resend-feedback-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                    )}
                    {resendMsg}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="registration-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onBackToLogin}
            >
              Back to Login
            </button>
          </div>
        </form>

        <div className="login-link">
          <p>
            Already have an account?{' '}
            <button 
              type="button"
              className="link-button"
              onClick={onBackToLogin}
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
