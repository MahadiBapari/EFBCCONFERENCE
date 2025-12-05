import React, { useState, useEffect } from 'react';
import '../../styles/UserSupport.css';
import apiClient from '../../services/apiClient';

interface Faq {
  id: number;
  question: string;
  answer: string;
  display_order: number;
}

interface UserSupportProps {
  initialContactInfo?: { contactEmail: string; contactPhone: string } | null;
  initialFaqs?: Faq[] | null;
  onLoadContactInfo?: () => Promise<void>;
  onLoadFaqs?: () => Promise<void>;
}

export const UserSupport: React.FC<UserSupportProps> = ({
  initialContactInfo,
  initialFaqs,
  onLoadContactInfo,
  onLoadFaqs,
}) => {
  const [contactInfo, setContactInfo] = useState<{ contactEmail: string; contactPhone: string }>(
    initialContactInfo || {
      contactEmail: 'info@efbcconference.org',
      contactPhone: '',
    }
  );
  const [faqs, setFaqs] = useState<Faq[]>(initialFaqs || []);
  const [loading, setLoading] = useState(!initialContactInfo);
  const [faqLoading, setFaqLoading] = useState(!initialFaqs);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Update state when props change
    if (initialContactInfo) {
      setContactInfo(initialContactInfo);
      setLoading(false);
    } else if (onLoadContactInfo) {
      // Trigger parent load, which will update cache and re-render with props
      onLoadContactInfo();
    } else {
      // Fallback: load directly if no props or loader provided
      const loadContactInfo = async () => {
        try {
          const response = await apiClient.get('/customization/contact/public') as any;
          if (response.success && response.data) {
            setContactInfo({
              contactEmail: response.data.contactEmail || 'info@efbcconference.org',
              contactPhone: response.data.contactPhone || '',
            });
          }
        } catch (err) {
          console.warn('Failed to load contact customization, using defaults:', err);
        } finally {
          setLoading(false);
        }
      };
      loadContactInfo();
    }
  }, [initialContactInfo, onLoadContactInfo]);

  useEffect(() => {
    // Update state when props change
    if (initialFaqs !== null && initialFaqs !== undefined) {
      setFaqs(initialFaqs);
      setFaqLoading(false);
    } else if (onLoadFaqs) {
      // Trigger parent load, which will update cache and re-render with props
      onLoadFaqs();
    } else {
      // Fallback: load directly if no props or loader provided
      const loadFaqs = async () => {
        try {
          setFaqLoading(true);
          const response = await apiClient.get('/customization/faq/public') as any;
          if (response.success && response.data) {
            setFaqs(Array.isArray(response.data) ? response.data : []);
          }
        } catch (err) {
          console.warn('Failed to load FAQs:', err);
        } finally {
          setFaqLoading(false);
        }
      };
      loadFaqs();
    }
  }, [initialFaqs, onLoadFaqs]);

//   const [formData, setFormData] = useState({
//     name: '',
//     email: '',
//     subject: '',
//     message: '',
//   });
//   const [submitted, setSubmitted] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
//     setFormData(prev => ({
//       ...prev,
//       [e.target.name]: e.target.value,
//     }));
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError(null);
//     setSubmitted(false);

//     // Basic validation
//     if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
//       setError('Please fill in all fields');
//       return;
//     }

//     // Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(formData.email)) {
//       setError('Please enter a valid email address');
//       return;
//     }

//     // Here you would typically send the form data to your backend
//     // For now, we'll just show a success message
//     try {
//       // TODO: Implement API call to send support request
//       // await apiClient.post('/support/contact', formData);
      
//       // Simulate API call
//       await new Promise(resolve => setTimeout(resolve, 500));
      
//       setSubmitted(true);
//       setFormData({
//         name: '',
//         email: '',
//         subject: '',
//         message: '',
//       });
//     } catch (err: any) {
//       setError(err?.response?.data?.error || 'Failed to send message. Please try again.');
//     }
//   };

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
              
              <div className="contact-details">
                <h3>Email</h3>
                <p>
                  {loading ? (
                    <span>Loading...</span>
                  ) : contactInfo.contactEmail ? (
                    <a href={`mailto:${contactInfo.contactEmail}`}>{contactInfo.contactEmail}</a>
                  ) : (
                    <span>Not available</span>
                  )}
                </p>
              </div>
            </div>
            {contactInfo.contactPhone && (
              <div className="contact-item">
                
                <div className="contact-details">
                  <h3>Phone</h3>
                  <p>
                    {loading ? (
                      <span>Loading...</span>
                    ) : (
                      <a href={`tel:${contactInfo.contactPhone}`}>{contactInfo.contactPhone}</a>
                    )}
                  </p>
                </div>
              </div>
            )}
            <div className="contact-item">
              
              {/* <div className="contact-details">
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
              */}
              <div className="contact-details">
                <h3>Response Time</h3>
                <p>Within 24 hours during business hours.</p>
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
          {faqLoading ? (
            <div>Loading FAQs...</div>
          ) : faqs.length === 0 ? (
            <div className="faq-empty">No FAQs available at this time.</div>
          ) : (
            <div className="faq-list">
              {faqs.map((faq) => (
                <div key={faq.id} className="faq-item">
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

