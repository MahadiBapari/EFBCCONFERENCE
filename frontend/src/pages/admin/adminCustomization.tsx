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

export interface Faq {
  id: number;
  question: string;
  answer: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
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
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [activeTab, setActiveTab] = useState<'email' | 'contact' | 'faq'>('email');
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
  
  // FAQ state
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', displayOrder: 0 });

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

  // FAQ functions
  const loadFaqs = useCallback(async () => {
    try {
      setFaqLoading(true);
      setError(null);
      const response = await apiClient.get('/customization/faq') as any;
      if (response.success && response.data) {
        setFaqs(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load FAQs');
    } finally {
      setFaqLoading(false);
    }
  }, []);

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      setError('Question and answer are required');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await apiClient.post('/customization/faq', {
        question: newFaq.question.trim(),
        answer: newFaq.answer.trim(),
        displayOrder: newFaq.displayOrder || 0,
      }) as any;

      if (response.success) {
        setSuccess('FAQ created successfully!');
        setNewFaq({ question: '', answer: '', displayOrder: 0 });
        await loadFaqs();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to create FAQ');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq) return;
    if (!editingFaq.question.trim() || !editingFaq.answer.trim()) {
      setError('Question and answer are required');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await apiClient.put(`/customization/faq/${editingFaq.id}`, {
        question: editingFaq.question.trim(),
        answer: editingFaq.answer.trim(),
        displayOrder: editingFaq.display_order || 0,
      }) as any;

      if (response.success) {
        setSuccess('FAQ updated successfully!');
        setEditingFaq(null);
        await loadFaqs();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to update FAQ');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFaq = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await apiClient.delete(`/customization/faq/${id}`) as any;

      if (response.success) {
        setSuccess('FAQ deleted successfully!');
        await loadFaqs();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to delete FAQ');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to delete FAQ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Customization</h1>
        </div>
        <div className="card">
            <span>Loading customization…</span>
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
        <button
          type="button"
          className={`customization-tab-btn ${activeTab === 'faq' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('faq');
            loadFaqs();
          }}
        >
          FAQ
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

      {activeTab === 'faq' && (
        <div className="customization-form">
          <div className="card">
            <h2>Frequently Asked Questions</h2>
            <p className="field-description">
              Manage the FAQ section displayed on the Support & Contact page. You can add, edit, and delete questions and answers.
            </p>

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

            {/* Add New FAQ Form */}
            <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <h3>{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</h3>
              <form onSubmit={editingFaq ? handleUpdateFaq : handleCreateFaq}>
                <div className="form-group">
                  <label htmlFor="faqQuestion">Question *</label>
                  <input
                    id="faqQuestion"
                    type="text"
                    className="form-control"
                    value={editingFaq ? editingFaq.question : newFaq.question}
                    onChange={(e) => editingFaq 
                      ? setEditingFaq({ ...editingFaq, question: e.target.value })
                      : setNewFaq({ ...newFaq, question: e.target.value })
                    }
                    placeholder="Enter the question"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="faqAnswer">Answer *</label>
                  <textarea
                    id="faqAnswer"
                    className="form-control"
                    rows={4}
                    value={editingFaq ? editingFaq.answer : newFaq.answer}
                    onChange={(e) => editingFaq
                      ? setEditingFaq({ ...editingFaq, answer: e.target.value })
                      : setNewFaq({ ...newFaq, answer: e.target.value })
                    }
                    placeholder="Enter the answer"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="faqOrder">Display Order</label>
                  <input
                    id="faqOrder"
                    type="number"
                    className="form-control"
                    value={editingFaq ? editingFaq.display_order : newFaq.displayOrder}
                    onChange={(e) => editingFaq
                      ? setEditingFaq({ ...editingFaq, display_order: parseInt(e.target.value) || 0 })
                      : setNewFaq({ ...newFaq, displayOrder: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                    min="0"
                  />
                  <small className="form-text">Lower numbers appear first. Use 0 for default order.</small>
                </div>
                <div className="form-actions">
                  {editingFaq && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEditingFaq(null)}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : editingFaq ? 'Update FAQ' : 'Add FAQ'}
                  </button>
                </div>
              </form>
            </div>

            {/* FAQ List */}
            {faqLoading ? (
              <div>Loading FAQs...</div>
            ) : faqs.length === 0 ? (
              <div className="alert alert-info">No FAQs yet. Add your first FAQ above.</div>
            ) : (
              <div>
                <h3>Existing FAQs ({faqs.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {faqs.map((faq) => (
                    <div key={faq.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Q: {faq.question}</strong>
                          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>A: {faq.answer}</p>
                          <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
                            Order: {faq.display_order}
                          </small>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditingFaq(faq)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteFaq(faq.id)}
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

