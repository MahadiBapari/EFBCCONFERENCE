import React, { useState, useEffect, useCallback } from 'react';
import '../../styles/AdminCustomization.css';
import apiClient from '../../services/apiClient';

export interface EmailCustomization {
  id: number | null;
  headerText: string;
  footerText: string;
  updatedAt: string | null;
}

export interface ContactCustomization {
  id: number | null;
  contactEmail: string;
  contactPhone: string;
  updatedAt: string | null;
}

interface AdminCustomizationProps {
  initialCustomization?: EmailCustomization | null;
  initialContactCustomization?: ContactCustomization | null;
  onCacheUpdate?: (customization: EmailCustomization) => void;
  onContactCacheUpdate?: (customization: ContactCustomization) => void;
}

export const AdminCustomization: React.FC<AdminCustomizationProps> = ({
  initialCustomization,
  initialContactCustomization,
  onCacheUpdate,
  onContactCacheUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'contact'>('email');
  const [customization, setCustomization] = useState<EmailCustomization>(
    initialCustomization || {
      id: null,
      headerText: '',
      footerText: '',
      updatedAt: null,
    }
  );
  const [contactCustomization, setContactCustomization] = useState<ContactCustomization>(
    initialContactCustomization || {
      id: null,
      contactEmail: '',
      contactPhone: '',
      updatedAt: null,
    }
  );
  const [loading, setLoading] = useState(!initialCustomization || !initialContactCustomization);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCustomization = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.get('/customization/email') as any;
      if (response.success && response.data) {
        const next: EmailCustomization = {
          id: response.data.id,
          headerText: response.data.headerText || '',
          footerText: response.data.footerText || '',
          updatedAt: response.data.updatedAt,
        };
        setCustomization(next);
        if (onCacheUpdate) onCacheUpdate(next);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load email customization');
    }
  }, [onCacheUpdate]);

  const loadContactCustomization = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.get('/customization/contact') as any;
      if (response.success && response.data) {
        const next: ContactCustomization = {
          id: response.data.id,
          contactEmail: response.data.contactEmail || '',
          contactPhone: response.data.contactPhone || '',
          updatedAt: response.data.updatedAt,
        };
        setContactCustomization(next);
        if (onContactCacheUpdate) onContactCacheUpdate(next);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load contact customization');
    }
  }, [onContactCacheUpdate]);

  useEffect(() => {
    const loadData = async () => {
      if (initialCustomization && initialContactCustomization) {
        setCustomization(initialCustomization);
        setContactCustomization(initialContactCustomization);
        setLoading(false);
      } else {
        setLoading(true);
        await Promise.all([
          initialCustomization ? Promise.resolve() : loadCustomization(),
          initialContactCustomization ? Promise.resolve() : loadContactCustomization(),
        ]);
        setLoading(false);
      }
    };
    loadData();
  }, [initialCustomization, initialContactCustomization, loadCustomization, loadContactCustomization]);

  const handleSaveEmail = async (e: React.FormEvent) => {
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

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await apiClient.put('/customization/contact', {
        contactEmail: contactCustomization.contactEmail,
        contactPhone: contactCustomization.contactPhone,
      }) as any;

      if (response.success) {
        setSuccess('Contact customization saved successfully!');
        await loadContactCustomization();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to save contact customization');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save contact customization');
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
            <span>Loading email customization…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Customization</h1>
        <p className="page-description">
          Customize email templates and contact information.
        </p>
      </div>

      <div className="customization-tabs">
        <button
          type="button"
          className={`customization-tab-btn ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          Email
        </button>
        <button
          type="button"
          className={`customization-tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          Contact
        </button>
      </div>

      {activeTab === 'email' && (
        <form onSubmit={handleSaveEmail} className="customization-form">
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
            {saving ? 'Saving...' : 'Save Email Customization'}
          </button>
        </div>
      </form>
      )}

      {activeTab === 'contact' && (
        <form onSubmit={handleSaveContact} className="customization-form">
          <div className="card">
            <h2>Contact Information</h2>
            <p className="field-description">
              Customize the contact email and phone number displayed on the Support & Contact page.
            </p>
            <div className="form-group">
              <label htmlFor="contactEmail">Contact Email</label>
              <input
                id="contactEmail"
                type="email"
                className="form-control"
                value={contactCustomization.contactEmail}
                onChange={(e) => setContactCustomization({ ...contactCustomization, contactEmail: e.target.value })}
                placeholder="e.g., info@efbcconference.org"
              />
            </div>
            <div className="form-group">
              <label htmlFor="contactPhone">Contact Phone</label>
              <input
                id="contactPhone"
                type="tel"
                className="form-control"
                value={contactCustomization.contactPhone}
                onChange={(e) => setContactCustomization({ ...contactCustomization, contactPhone: e.target.value })}
                placeholder="e.g., +1 (555) 123-4567"
              />
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
              {saving ? 'Saving...' : 'Save Contact Customization'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

