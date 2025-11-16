import React, { useState, useEffect } from 'react';
import '../../styles/AdminCustomization.css';
import apiClient from '../../services/apiClient';

interface EmailCustomization {
  id: number | null;
  headerText: string;
  footerText: string;
  updatedAt: string | null;
}

export const AdminCustomization: React.FC = () => {
  const [customization, setCustomization] = useState<EmailCustomization>({
    id: null,
    headerText: '',
    footerText: '',
    updatedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadCustomization();
  }, []);

  const loadCustomization = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/customization/email') as any;
      if (response.success && response.data) {
        setCustomization({
          id: response.data.id,
          headerText: response.data.headerText || '',
          footerText: response.data.footerText || '',
          updatedAt: response.data.updatedAt,
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load email customization');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await apiClient.put('/customization/email', {
        headerText: customization.headerText,
        footerText: customization.footerText,
      }) as any;

      if (response.success) {
        setSuccess('Email customization saved successfully!');
        await loadCustomization();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to save customization');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save email customization');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Email Customization</h1>
        </div>
        <div className="card">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Email Customization</h1>
        <p className="page-description">
          Customize the header and footer text that will appear in all email templates.
        </p>
      </div>

      <form onSubmit={handleSave} className="customization-form">
        <div className="card">
          <h2>Email Header</h2>
          <p className="field-description">
            Custom text to appear at the top of email templates (optional).
          </p>
          <div className="form-group">
            <label htmlFor="headerText">Header Text</label>
            <textarea
              id="headerText"
              className="form-control"
              rows={3}
              value={customization.headerText}
              onChange={(e) => setCustomization({ ...customization, headerText: e.target.value })}
              placeholder="Enter custom header text (optional)"
            />
          </div>
        </div>

        <div className="card">
          <h2>Email Footer</h2>
          <p className="field-description">
            Custom text to appear at the bottom of all email templates. This will be added to every email sent from the system.
          </p>
          <div className="form-group">
            <label htmlFor="footerText">Footer Text *</label>
            <textarea
              id="footerText"
              className="form-control"
              rows={6}
              value={customization.footerText}
              onChange={(e) => setCustomization({ ...customization, footerText: e.target.value })}
              placeholder="Enter custom footer text that will appear in all emails"
              required
            />
            <small className="form-text">
              This footer will be automatically added to all email templates.
            </small>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Customization'}
          </button>
        </div>
      </form>
    </div>
  );
};

