import React, { useState } from 'react';
import '../../styles/UserSupport.css';

export const UserSupport: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitted(false);

    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Here you would typically send the form data to your backend
    // For now, we'll just show a success message
    try {
      // TODO: Implement API call to send support request
      // await apiClient.post('/support/contact', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to send message. Please try again.');
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>Support & Contact</h1>
      </div>

      <div className="support-content">
        <div className="support-grid">
          {/* Contact Information Card */}
          <div className="card contact-info-card">
            <h2>Contact Information</h2>
            <div className="contact-item">
              <div className="contact-icon">📧</div>
              <div className="contact-details">
                <h3>Email</h3>
                <p>
                  <a href="mailto:info@efbcconference.org">info@efbcconference.org</a>
                </p>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon">📍</div>
              <div className="contact-details">
                <h3>Address</h3>
                <p>
                  EFBC Conference Inc<br />
                  127 Low Country Lane<br />
                  The Woodlands, TX 77380<br />
                  USA
                </p>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon">⏰</div>
              <div className="contact-details">
                <h3>Response Time</h3>
                <p>We typically respond within 24-48 hours during business days.</p>
              </div>
            </div>
          </div>

          {/* Contact Form Card
          <div className="card contact-form-card">
            <h2>Send us a Message</h2>
            {submitted && (
              <div className="alert alert-success">
                <strong>Thank you!</strong> Your message has been sent successfully. We'll get back to you soon.
              </div>
            )}
            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Your Name <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Your Email <span className="required-asterisk">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-control"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="subject" className="form-label">
                  Subject <span className="required-asterisk">*</span>
                </label>
                <select
                  id="subject"
                  name="subject"
                  className="form-control"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a subject</option>
                  <option value="registration">Registration Questions</option>
                  <option value="payment">Payment Issues</option>
                  <option value="event">Event Information</option>
                  <option value="technical">Technical Support</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="message" className="form-label">
                  Message <span className="required-asterisk">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  className="form-control"
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Please provide details about your question or issue..."
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Send Message
                </button>
              </div>
            </form>
          </div> */}
        </div>

        {/* FAQ Section */}
        <div className="card faq-section">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h3>How do I register for an event?</h3>
              <p>Navigate to your Dashboard and click "Register Now" on the active event card. Fill out the registration form and complete payment.</p>
            </div>
            <div className="faq-item">
              <h3>Can I edit my registration after submitting?</h3>
              <p>Yes, you can edit your registration from the Dashboard by clicking the "Edit" button on your registration card. Note that you cannot add a spouse ticket after initial registration.</p>
            </div>
            <div className="faq-item">
              <h3>What payment methods are accepted?</h3>
              <p>We accept credit/debit cards (via Square) and checks. If paying by check, please mail it to the address provided before the registration deadline.</p>
            </div>
            <div className="faq-item">
              <h3>How do I cancel my registration?</h3>
              <p>You can request cancellation from your Dashboard. Click "Cancel Registration" and provide a reason. Your cancellation request will be reviewed by an administrator.</p>
            </div>
            <div className="faq-item">
              <h3>I forgot my password. How do I reset it?</h3>
              <p>On the login page, click "Forgot Password" and enter your email address. You'll receive a password reset link via email.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

